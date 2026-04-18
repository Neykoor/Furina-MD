import pkg from '@whiskeysockets/baileys'

const {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    proto,
    WA_DEFAULT_EPHEMERAL
} = pkg
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const makeWASocket = pkg.default
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const imagenSerBot = 'https://files.catbox.moe/gptlxc.jpg'

const mensajeQR = `╭─〔 💻 𝘼𝙎𝙏𝘼 𝘽𝙊𝙏 • 𝙈𝙊𝘿𝙊 𝙌𝙍 〕─╮
│
│  📲 Escanea este *QR* desde otro celular o PC
│  para convertirte en un *Sub-Bot* de Asta.
│
│  1️⃣  Pulsa los ⋮ tres puntos arriba a la derecha
│  2️⃣  Ve a *Dispositivos vinculados*
│  3️⃣  Escanea el QR y ¡listo! ⚡
│
│  ⏳  *Expira en 45 segundos.*
╰───────────────────────`

const mensajeCode = `╭─[ 💻 𝘼𝙎𝙏𝘼 𝘽𝙊𝙏 • 𝙈𝙊𝘿𝙊 𝘾𝙊𝘿𝙀 ]─╮
│
│  🧠  Este es el *Modo CODE* de Asta Bot.
│  Ingresa el código desde otro celular o PC
│  para convertirte en un *Sub-Bot*.
│
│  1️⃣  Pulsa los ⋮ tres puntos arriba a la derecha
│  2️⃣  Entra en *Dispositivos vinculados*
│  3️⃣  Selecciona *Vincular con código de 8 dígitos*
│  4️⃣  Ingresa el código que aparecerá a continuación
│
│  ⏳  *Expira en 45 segundos.*
╰────────────────────────╯`

if (!global.subBots) global.subBots = new Map()
if (!global.subBotsData) global.subBotsData = new Map()
if (!global.sentCodes) global.sentCodes = new Map()
if (!global.subBotReconnectAttempts) global.subBotReconnectAttempts = new Map()

const SUBBOT_FOLDER = './sessions/subbots'

function normalize(num) {
    return String(num).replace(/[^0-9]/g, '')
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function msToTime(duration) {
    const seconds = Math.floor((duration / 1000) % 60)
    const minutes = Math.floor((duration / (1000 * 60)) % 60)
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
}

function isSubBotConnected(userId) {
    const targetId = normalize(userId)
    return global.subBots.has(targetId) && global.subBots.get(targetId)?.ws?.readyState === 1
}

async function sendCodeCopyButton(conn, jid, code, botName, quoted) {
    const interactiveMessage = {
        body: {
            text: '📋 Presiona el botón para copiar tu código'
        },
        footer: {
            text: botName
        },
        header: {
            title: code,
            hasMediaAttachment: false
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copiar código',
                        copy_code: code,
                        id: `copy_${Date.now()}`
                    })
                }
            ],
            messageParamsJson: ''
        }
    }

    const messageContent = proto.Message.fromObject({
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage
            }
        }
    })

    const msg = await generateWAMessageFromContent(jid, messageContent, {
        userJid: conn.user.jid,
        quoted: quoted,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL
    })

    await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
    return msg
}

async function sendReply(conn, jid, text, quoted) {
    return conn.sendMessage(jid, { text }, { quoted })
}

async function cleanSubBotCache(sessionPath) {
    try {
        const filesToClean = [
            'pre-key-store.json', 'sender-key-store.json',
            'session-store.json', 'app-state-sync-key-store.json'
        ]
        for (const file of filesToClean) {
            const fp = path.join(sessionPath, file)
            if (!fs.existsSync(fp)) continue
            try {
                const data = JSON.parse(fs.readFileSync(fp, 'utf-8'))
                const cutoff = Date.now() - 48 * 60 * 60 * 1000
                let changed = false
                if (typeof data === 'object' && data !== null) {
                    for (const key of Object.keys(data)) {
                        if (data[key]?.timestamp && data[key].timestamp < cutoff) {
                            delete data[key]
                            changed = true
                        }
                    }
                    if (changed) fs.writeFileSync(fp, JSON.stringify(data))
                }
            } catch {}
        }
    } catch {}
}

async function cleanupSession(sessionPath, userId) {
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }
    } catch (e) {
        console.error('Error eliminando sesión:', e)
    }
    global.subBots.delete(userId)
    global.subBotsData.delete(userId)
    global.sentCodes.delete(userId)
    global.subBotReconnectAttempts.delete(userId)
}

export async function createSubBot(options) {
    let {
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId,
        maxReconnectAttempts = 3,
        isReconnect = false,
        isAutoStart = false,
        savedConfig = null,
        mcode = false
    } = options

    let reconnectAttempts = global.subBotReconnectAttempts.get(userId) || 0

    if (isReconnect) {
        reconnectAttempts++
        global.subBotReconnectAttempts.set(userId, reconnectAttempts)
        console.log(chalk.yellow(`🔄 Reintento ${reconnectAttempts}/${maxReconnectAttempts} para ${userId}`))

        if (reconnectAttempts > maxReconnectAttempts) {
            console.log(chalk.red(`❌ Máximos reintentos alcanzados para ${userId}`))
            if (m && !isAutoStart) {
                await sendReply(conn, m.chat, `❌ No se pudo reconectar el SubBot después de ${maxReconnectAttempts} intentos.`, m)
            }
            return cleanupSession(sessionPath, userId)
        }
        await delay(5000 * reconnectAttempts)
    }

    const { version } = await fetchLatestBaileysVersion()
    const msgRetryCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const connectionOptions = {
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        msgRetryCounterCache: msgRetryCache,
        browser: ['Asta Bot', 'Chrome', '2.0.0'],
        version,
        generateHighQualityLinkPreview: true,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    }

    let sock = makeWASocket(connectionOptions)

    const defaultConfig = {
        name: `SubBot-${userId}`,
        owner: m?.sender || null,
        createdAt: new Date().toISOString(),
        sessionPath: sessionPath
    }

    const configPath = path.join(sessionPath, 'config.json')
    let subBotConfig

    try {
        if (savedConfig && Object.keys(savedConfig).length > 0) {
            subBotConfig = savedConfig
        } else if (fs.existsSync(configPath)) {
            subBotConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        } else {
            subBotConfig = defaultConfig
            fs.writeFileSync(configPath, JSON.stringify(subBotConfig, null, 2))
        }
    } catch {
        subBotConfig = defaultConfig
    }

    sock.subConfig = subBotConfig
    sock.userId = userId

    let qrTimer = null
    let connectionTimer = null
    let codeSent = false

    const cleanup = async (fullCleanup = false) => {
        if (qrTimer) clearTimeout(qrTimer)
        if (connectionTimer) clearTimeout(connectionTimer)

        try {
            sock.ev.removeAllListeners()
            if (sock.ws?.readyState === 1) sock.ws.close()
        } catch (e) {}

        if (fullCleanup) {
            await cleanupSession(sessionPath, userId)
        }
    }

    if (!isReconnect && !isAutoStart) {
        connectionTimer = setTimeout(async () => {
            if (!sock.user) {
                console.log(chalk.yellow(`⏰ Timeout de conexión para ${userId}`))
                await cleanup(true)
                if (m) await sendReply(conn, m.chat, '⏰ Tiempo de espera agotado. Intenta nuevamente.', m)
            }
        }, 120000)
    }

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr && !sock.user) {
            if (global.sentCodes.has(userId) || codeSent) {
                console.log(chalk.yellow(`⚠️ Código/QR ya enviado a ${userId}, ignorando...`))
                return
            }

            codeSent = true
            
            global.sentCodes.set(userId, {
                timestamp: Date.now(),
                type: mcode ? 'code' : 'qr'
            })

            if (mcode) {
                try {
                    const secret = await sock.requestPairingCode(userId)
                    const formattedCode = secret.match(/.{1,4}/g)?.join('-') || secret
                    const botName = global.namebot || 'Asta Bot'

                    await conn.sendMessage(m.chat, {
                        image: { url: imagenSerBot },
                        caption: mensajeCode.trim()
                    }, { quoted: m })

                    const codeMsg = await sendCodeCopyButton(conn, m.chat, formattedCode, botName, m)

                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: codeMsg.key }).catch(() => {})
                        global.sentCodes.delete(userId)
                    }, 45000)

                } catch (e) {
                    console.error('Error pairing code:', e)
                    global.sentCodes.delete(userId)
                    codeSent = false
                    if (m) await sendReply(conn, m.chat, '❌ Error generando código. Intenta con QR: ' + usedPrefix + 'qr', m)
                }

            } else {
                try {
                    const qrBuffer = await qrcode.toBuffer(qr, {
                        scale: 8,
                        margin: 2,
                        errorCorrectionLevel: 'H'
                    })

                    const qrMsg = await conn.sendMessage(m.chat, {
                        image: qrBuffer,
                        caption: mensajeQR.trim()
                    }, { quoted: m })

                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: qrMsg.key }).catch(() => {})
                        global.sentCodes.delete(userId)
                    }, 45000)

                } catch (e) {
                    console.error('Error generando QR:', e)
                    global.sentCodes.delete(userId)
                    codeSent = false
                }
            }
            return
        }

        if (connection === 'open') {
            if (connectionTimer) clearTimeout(connectionTimer)
            global.subBotReconnectAttempts.delete(userId)
            global.sentCodes.delete(userId)

            const sessionData = {
                jid: sock.user.jid,
                name: sock.user.name || 'SubBot',
                userId: userId,
                owner: m?.sender || subBotConfig.owner,
                connectedAt: new Date().toISOString(),
                config: sock.subConfig
            }
            
            fs.mkdirSync(sessionPath, { recursive: true })
            fs.writeFileSync(path.join(sessionPath, 'session.json'), JSON.stringify(sessionData, null, 2))

            global.subBots.set(userId, sock)
            global.subBotsData.set(userId, sessionData)

            sock.subConfig.jid = sock.user.jid
            sock.subConfig.updatedAt = new Date().toISOString()
            fs.writeFileSync(configPath, JSON.stringify(sock.subConfig, null, 2))

            console.log(chalk.green.bold(
                `\n✅ SUBBOT CONECTADO\n` +
                `├─ User: ${sock.user.name}\n` +
                `├─ JID: ${sock.user.jid}\n` +
                `└─ ID: ${userId}\n`
            ))

            if (!isReconnect && !isAutoStart && m?.chat) {
                await conn.sendMessage(m.chat, {
                    text: `✅ *SubBot Conectado!*\n\n` +
                          `🤖 ${sock.user.name}\n` +
                          `📱 ${sock.user.jid.split('@')[0]}\n` +
                          `👤 Owner: @${m.sender.split('@')[0]}\n\n` +
                          `⚙️ Comandos disponibles:\n` +
                          `• ${usedPrefix}listsub - Listar sub-bots\n` +
                          `• ${usedPrefix}delsub ${userId} - Eliminar sub-bot`,
                    mentions: [m.sender]
                }).catch(() => {})
            }

            if (global.IDchannel) {
                await sock.newsletterFollow(global.IDchannel).catch(() => {})
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode ||
                              lastDisconnect?.error?.output?.payload?.statusCode

            console.log(chalk.yellow(`🔌 SubBot ${userId} desconectado: ${statusCode}`))

            const shouldCleanup = [
                DisconnectReason.loggedOut,
                DisconnectReason.badSession,
                401, 403, 405
            ].includes(statusCode)

            global.subBots.delete(userId)

            if (shouldCleanup) {
                console.log(chalk.red(`🗑️ Sesión inválida, limpiando: ${userId}`))
                await cleanup(true)
                if (m && !isAutoStart) {
                    await sendReply(conn, m.chat, `❌ Sesión inválida. Vuelve a vincular con ${usedPrefix}qr`, m)
                }
                return
            }

            if (reconnectAttempts < maxReconnectAttempts) {
                console.log(chalk.blue(`🔄 Reconectando ${userId}...`))
                await cleanup(false)
                await delay(Math.min(4000 * Math.pow(2, reconnectAttempts), 30000))
                await createSubBot({
                    ...options,
                    isReconnect: true
                })
            } else {
                await cleanup(true)
                if (m && !isAutoStart) {
                    await sendReply(conn, m.chat, `❌ SubBot desconectado permanentemente.`, m)
                }
            }
        }
    }

    let handlerModule
    try {
        handlerModule = await import('../../lib/handler.js')
    } catch (e) {
        console.error('Error cargando handler:', e)
    }

    const setupListeners = () => {
        if (handlerModule?.handler) {
            sock.handler = handlerModule.handler.bind(sock)
            sock.connectionUpdate = connectionUpdate.bind(sock)
            sock.credsUpdate = saveCreds.bind(sock)

            sock.ev.on('messages.upsert', sock.handler)
            sock.ev.on('connection.update', sock.connectionUpdate)
            sock.ev.on('creds.update', sock.credsUpdate)
        }
    }

    setupListeners()
}

export async function autoStartSubBots() {
    if (!fs.existsSync(SUBBOT_FOLDER)) {
        fs.mkdirSync(SUBBOT_FOLDER, { recursive: true })
        return
    }

    const sessions = fs.readdirSync(SUBBOT_FOLDER).filter(f => {
        const fullPath = path.join(SUBBOT_FOLDER, f)
        return fs.statSync(fullPath).isDirectory() &&
               fs.existsSync(path.join(fullPath, 'creds.json'))
    })

    if (!sessions.length) {
        console.log(chalk.gray('📭 Sin sub-bots guardados.'))
        return
    }

    console.log(chalk.cyan(`\n🔄 Restaurando ${sessions.length} sub-bot(s)...`))

    for (const userId of sessions) {
        try {
            const sessionPath = path.join(SUBBOT_FOLDER, userId)
            const configPath = path.join(sessionPath, 'config.json')
            let savedConfig = {}
            if (fs.existsSync(configPath)) {
                savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            }
            await cleanSubBotCache(sessionPath)
            console.log(chalk.blue(`  ↳ Iniciando: ${userId}`))
            await createSubBot({
                sessionPath,
                m: null,
                conn: global.conn,
                usedPrefix: global.prefix || '.',
                userId,
                maxReconnectAttempts: 5,
                isReconnect: false,
                isAutoStart: true,
                savedConfig,
                mcode: false
            })
            await delay(2000)
        } catch (e) {
            console.error(chalk.red(`  ✖ Error restaurando ${userId}: ${e.message}`))
        }
    }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const userId = normalize(m.sender)
    
    const isCodeMode = command === 'code' || args.includes('code') || args.includes('--code')
    
    const maxSubBots = global.maxSubBots || 10
    const activeSubBots = global.subBots.size
    
    if (activeSubBots >= maxSubBots && !m.isOwner) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ *LÍMITE ALCANZADO*\n` +
                  `• Activos: ${activeSubBots}/${maxSubBots}\n` +
                  `• Usa *${usedPrefix}listsub* para ver tus sub-bots\n` +
                  `• Usa *${usedPrefix}delsub <id>* para eliminar uno`
        }, { quoted: m })
    }

    if (isSubBotConnected(userId)) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ya tienes un SubBot activo.\n\n` +
                  `• *${usedPrefix}listsub* - Ver tus sub-bots\n` +
                  `• *${usedPrefix}delsub ${userId}* - Eliminar actual`
        }, { quoted: m })
    }

    const sessionPath = path.join(SUBBOT_FOLDER, userId)

    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true })
            await delay(1000)
        } catch (e) {
            console.error('Error limpiando sesión:', e)
        }
    }

    fs.mkdirSync(sessionPath, { recursive: true })
    global.sentCodes.delete(userId)

    await conn.sendMessage(m.chat, {
        text: `⏳ *Iniciando vinculación...*\n\n📱 Modo: ${isCodeMode ? 'Código' : 'QR'}\n⏰ Tienes 45 segundos para vincular.`
    }, { quoted: m })

    await createSubBot({
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId,
        maxReconnectAttempts: 3,
        isReconnect: false,
        isAutoStart: false,
        mcode: isCodeMode
    })
}

handler.help = ['qr', 'code', 'serbot']
handler.tags = ['serbot']
handler.command = ['qr', 'code', 'serbot', 'servot']

export default handler
