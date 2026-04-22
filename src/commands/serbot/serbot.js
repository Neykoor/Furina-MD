// subbot.js - CORREGIDO (sin exportaciones duplicadas)
import pkg from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import { pathToFileURL, fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    proto,
    WA_DEFAULT_EPHEMERAL,
    default: makeWASocket,
    Browsers
} = pkg

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════
const SUBBOT_FOLDER = path.join(process.cwd(), 'session', 'Sub-bots')
const MAX_SUBBOTS_PER_USER = 3
const CONNECTION_TIMEOUT = 90000
const QR_EXPIRY = 45000
const CODE_EXPIRY = 55000
const RECONNECT_DELAY_BASE = 5000
const MAX_RECONNECT_ATTEMPTS = 3

// Mensajes
const MSG_QR = `╭─〔 💻 𝘼𝙎𝙏𝘼 𝘽𝙊𝙏 • 𝙈𝙊𝘿𝙊 𝙌𝙍 〕─╮
│
│  📲 Escanea este *QR* desde otro celular o PC
│  para convertirte en un *Sub-Bot* de Asta.
│
│  1️⃣  Pulsa los ⋮ tres puntos arriba a la derecha
│  2️⃣  Ve a *Dispositivos vinculados*
│  3️⃣  Escanea el QR y ¡Listo! ⚡
│
│  ⏳  *Expira en 45 segundos.*
╰───────────────────────`

const MSG_CODE = `╭─[ 💻 𝘼𝙎𝙏𝘼 𝘽𝙊𝙏 • 𝙈𝙊𝘿𝙊 𝘾𝙊𝘿𝙀 ]─╮
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
│  ⏳  *Expira en 60 segundos.*
╰────────────────────────╯`

// ═══════════════════════════════════════════════════════════════════
// SILENCIAR LOGS DE BAILEYS (SOLUCIÓN DEFINITIVA)
// ═══════════════════════════════════════════════════════════════════
const SILENT_PATTERNS = [
    'Bad MAC', 'Failed to decrypt', 'Session error', 'decryptWithSessions',
    'verifyMAC', 'SessionEntry', 'Closing session', 'Closing open session',
    'Removing old closed session', 'Closing stale open session', '_chains:', 'chainKey',
    'chainType', 'messageKeys', 'currentRatchet', 'ephemeralKeyPair',
    'lastRemoteEphemeralKey', 'rootKey', 'indexInfo', 'baseKey', 'baseKeyType',
    'pendingPreKey', 'registrationId', 'stream errored', 'connection closed',
    'preKeyId:', 'signedKeyId:', 'remoteIdentityKey:', 'pubKey:', 'privKey:',
    'previousCounter:', 'closed:', 'used:', 'created:', 'Socket closed',
    'Timed out', 'rate limit', 'not-authorized', 'Connection closed',
    'ECONNRESET', 'socket hang up'
]

// Guardar originales
const _origError = console.error
const _origLog = console.log
const _origWarn = console.warn

// Función para verificar si un mensaje debe ser silenciado
function shouldSilence(...args) {
    return args.some(arg => {
        if (!arg) return false
        if (typeof arg === 'string') {
            return SILENT_PATTERNS.some(p => arg.includes(p))
        }
        if (typeof arg === 'object') {
            try {
                const keys = ['_chains', 'registrationId', 'currentRatchet', 'indexInfo', 'pendingPreKey']
                if (keys.some(k => k in arg)) return true
                const str = JSON.stringify(arg)
                return SILENT_PATTERNS.some(p => str.includes(p))
            } catch {
                return false
            }
        }
        return false
    })
}

// Sobrescribir console methods ANTES de crear cualquier socket
console.error = function (...args) {
    if (shouldSilence(...args)) return
    _origError.apply(console, args)
}

console.log = function (...args) {
    if (shouldSilence(...args)) return
    _origLog.apply(console, args)
}

console.warn = function (...args) {
    if (shouldSilence(...args)) return
    _origWarn.apply(console, args)
}

// ═══════════════════════════════════════════════════════════════════
// GLOBALES
// ═══════════════════════════════════════════════════════════════════
if (!global.conns) global.conns = []
if (!global.subBots) global.subBots = new Map()
if (!global.subBotsData) global.subBotsData = new Map()
if (!global.sentCodes) global.sentCodes = new Map()
if (!global.subBotReconnectAttempts) global.subBotReconnectAttempts = new Map()

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════
const delay = ms => new Promise(r => setTimeout(r, ms))

export function cleanNum(jid) {
    if (!jid) return ''
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

function safeDelete(filePath) {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch { }
}

function safeRmDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true })
    } catch { }
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN SUB-BOT
// ═══════════════════════════════════════════════════════════════════
function defaultSubConfig(userId, ownerSender = null) {
    return {
        name: global.botname || 'Asta Bot',
        mode: 'public',
        antiPrivate: false,
        antiSpam: true,
        cooldown: 3000,
        logoUrl: null,
        logos: {},
        owner: ownerSender,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: null
    }
}

export function getSubConfig(userId) {
    const uid = cleanNum(userId) || userId
    const configPath = path.join(SUBBOT_FOLDER, uid, 'config.json')

    try {
        if (fs.existsSync(configPath)) {
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            return {
                ...defaultSubConfig(uid, saved.owner),
                ...saved,
                name: global.botname || saved.name || 'Asta Bot',
                logos: saved.logos || {}
            }
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error leyendo config de ${uid}:`), error.message)
    }

    return defaultSubConfig(uid)
}

export function saveSubConfig(userId, newData = {}) {
    const uid = cleanNum(userId) || userId
    const sessionPath = path.join(SUBBOT_FOLDER, uid)
    const configPath = path.join(sessionPath, 'config.json')

    ensureDirectory(sessionPath)

    const current = getSubConfig(uid)

    const mergedLogos = {
        ...(current.logos || {}),
        ...(newData.logos || {})
    }

    const merged = {
        ...current,
        ...newData,
        logos: newData.logos ? { ...mergedLogos } : (current.logos || {}),
        updatedAt: new Date().toISOString()
    }

    try {
        fs.writeFileSync(configPath, JSON.stringify(merged, null, 2))

        let sock = global.subBots.get(uid)

        if (!sock) {
            const botJid = `${uid}@s.whatsapp.net`
            sock = global.subBots.get(botJid)
        }

        if (!sock) {
            for (const [key, s] of global.subBots) {
                if (cleanNum(s.user?.jid || s.user?.id || key) === uid) {
                    sock = s
                    break
                }
            }
        }

        if (sock) {
            sock.subConfig = { ...merged }
            console.log(chalk.green(`✅ Config actualizada en memoria para ${uid}`))
        }

        return merged
    } catch (error) {
        console.error(chalk.red(`❌ Error guardando config de ${uid}:`), error.message)
        return current
    }
}

export async function cleanSubBotCache(userId) {
    const uid = cleanNum(userId) || userId
    const sessionPath = path.join(SUBBOT_FOLDER, uid)

    if (!fs.existsSync(sessionPath)) return

    const filesToDelete = [
        'pre-key-store.json', 'sender-key-store.json',
        'session-store.json', 'app-state-sync-key-store.json', 'store.json'
    ]

    for (const file of filesToDelete) {
        safeDelete(path.join(sessionPath, file))
    }

    try {
        const files = fs.readdirSync(sessionPath)
        for (const file of files) {
            if (file.endsWith('.tmp') || file.endsWith('.log')) {
                safeDelete(path.join(sessionPath, file))
            }
        }
    } catch { }
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICAR CONEXIÓN
// ═══════════════════════════════════════════════════════════════════
export function isSubBotConnected(jid) {
    if (!global.subBots?.size) return false

    const targetNum = cleanNum(jid)
    if (!targetNum) return false

    for (const [id, sock] of global.subBots) {
        try {
            if (!sock?.user) continue
            const sockNum = cleanNum(sock.user.jid || sock.user.id || id)
            if (sockNum === targetNum) {
                return sock.ws?.readyState === 1 || sock.ws?.readyState === 'OPEN'
            }
        } catch { continue }
    }
    return false
}

// ═══════════════════════════════════════════════════════════════════
// ENVIAR CÓDIGO CON BOTÓN
// ═══════════════════════════════════════════════════════════════════
async function sendCodeCopyButton(conn, jid, code, botName, quoted) {
    try {
        const interactiveMessage = {
            body: { text: '📋 Presiona el botón para copiar tu código' },
            footer: { text: botName },
            header: {
                title: code,
                hasMediaAttachment: false,
                subtitle: 'Código de vinculación'
            },
            nativeFlowMessage: {
                buttons: [{
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copiar código',
                        copy_code: code,
                        id: `copy_${Date.now()}`
                    })
                }],
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
            userJid: conn.user?.jid,
            quoted,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
        return msg
    } catch (error) {
        return await conn.sendMessage(jid, {
            text: `📋 *Código de vinculación:*\n\`${code}\`\n\n_Toca y mantén para copiar_`
        }, { quoted })
    }
}

// ═══════════════════════════════════════════════════════════════════
// CARGAR COMANDOS
// ═══════════════════════════════════════════════════════════════════
async function loadCommandsForSubBot() {
    const commands = new Map()

    try {
        const loaderPath = path.join(process.cwd(), 'lib', 'loader.js')
        if (!fs.existsSync(loaderPath)) return commands

        const { loadCommands } = await import(pathToFileURL(loaderPath).href)
        const commandsPath = path.join(process.cwd(), 'src', 'commands')
        if (!fs.existsSync(commandsPath)) return commands

        const archivos = loadCommands(commandsPath)

        for (const filePath of archivos) {
            try {
                const mod = await import(pathToFileURL(filePath).href)
                const plugin = mod.default || mod
                if (!plugin?.command) continue

                const cmds = [
                    ...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]),
                    ...(Array.isArray(plugin.aliases) ? plugin.aliases : [])
                ].filter(Boolean).map(c => c.toLowerCase())

                for (const cmd of cmds) {
                    if (!commands.has(cmd)) commands.set(cmd, { plugin, filePath })
                }
            } catch { }
        }
    } catch { }

    return commands
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAR HANDLER
// ═══════════════════════════════════════════════════════════════════
async function setupSubBotHandler(sock, userId) {
    const uid = cleanNum(userId) || userId

    sock.isSubBot = true
    sock.isMainBot = false
    sock.ownerId = uid

    let handlerModule = null
    const handlerPath = path.join(process.cwd(), 'lib', 'message-handler.js')

    if (fs.existsSync(handlerPath)) {
        try {
            handlerModule = await import(pathToFileURL(handlerPath).href)
        } catch (error) {
            console.error(chalk.red(`❌ Error cargando handler para ${uid}:`), error.message)
            return
        }
    }

    if (!handlerModule?.handleMessage) {
        console.error(chalk.red(`❌ handleMessage no exportado para ${uid}`))
        return
    }

    const commands = await loadCommandsForSubBot()
    const processedMessages = new NodeCache({ stdTTL: 30, checkperiod: 60 })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m?.messages?.length) return
            const msg = m.messages[0]
            if (!msg?.message || !msg.key?.id) return

            const uniqueKey = `${sock.user?.jid || 'unknown'}:${msg.key.id}`
            if (processedMessages.has(uniqueKey)) return
            processedMessages.set(uniqueKey, true)

            const { remoteJid } = msg.key
            if (remoteJid === 'status@broadcast') return
            if (msg.message.protocolMessage) return
            if (msg.message.senderKeyDistributionMessage) return

            await handlerModule.handleMessage(sock, msg, commands)
        } catch (error) {
            const errMsg = error?.message || ''
            if (!SILENT_PATTERNS.some(p => errMsg.includes(p))) {
                console.error(chalk.yellow(`⚠️ Error en sub-bot ${uid}:`), errMsg.substring(0, 100))
            }
        }
    })

    console.log(chalk.green(`✅ Sub-bot ${uid} listo con ${commands.size} comandos`))
}

// ═══════════════════════════════════════════════════════════════════
// CREAR SUB-BOT
// ═══════════════════════════════════════════════════════════════════
export async function createSubBot(options = {}) {
    const {
        sessionPath,
        m = null,
        conn = null,
        userId,
        isAutoStart = false,
        mcode = false,
        savedConfig = null
    } = options

    const uid = cleanNum(userId) || userId
    if (!uid) {
        console.error(chalk.red('❌ userId inválido'))
        return
    }

    const ownerSender = m?.sender || null

    let { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 0] }))

    if (isSubBotConnected(uid)) {
        console.log(chalk.yellow(`⚠️ Sub-bot ${uid} ya está conectado`))
        return
    }

    if (!isAutoStart && ownerSender) {
        const ownerId = cleanNum(ownerSender)
        let userCount = 0
        for (const [, data] of global.subBotsData) {
            if (data?.owner && cleanNum(data.owner) === ownerId) userCount++
        }

        if (userCount >= MAX_SUBBOTS_PER_USER) {
            if (conn && m) {
                await conn.sendMessage(m.chat, {
                    text: `⚠️ Máximo *${MAX_SUBBOTS_PER_USER}* sub-bots por usuario.`
                }, { quoted: m })
            }
            return
        }
    }

    ensureDirectory(sessionPath)
    global.sentCodes.delete(uid)

    let state, saveCreds
    try {
        const auth = await useMultiFileAuthState(sessionPath)
        state = auth.state
        saveCreds = auth.saveCreds
    } catch (error) {
        console.error(chalk.red(`❌ Error cargando auth para ${uid}:`), error.message)
        if (!isAutoStart && conn && m) {
            await conn.sendMessage(m.chat, {
                text: '❌ Error al iniciar sesión. Intenta de nuevo.'
            }, { quoted: m })
        }
        return
    }

    const msgRetryCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        msgRetryCounterCache: msgRetryCache,
        browser: Browsers.ubuntu('Chrome'),
        version,
        generateHighQualityLinkPreview: true,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 3,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: true
    })

    const config = {
        ...defaultSubConfig(uid, ownerSender),
        ...(savedConfig || getSubConfig(uid))
    }

    Object.assign(sock, {
        userId: uid,
        sessionPath,
        isSubBot: true,
        isMainBot: false,
        ownerId: cleanNum(config.owner || ownerSender || uid),
        subConfig: config
    })

    let qrTimer = null
    let connectionTimer = null
    let codeSent = false
    let isConnected = false
    let reconnectAttempts = global.subBotReconnectAttempts.get(uid) || 0
    let currentQR = null

    const cleanup = async (fullCleanup = false) => {
        if (qrTimer) clearTimeout(qrTimer)
        if (connectionTimer) clearTimeout(connectionTimer)

        try {
            sock.ev.removeAllListeners()
            if (sock.ws?.readyState === 1) sock.ws.close()
        } catch { }

        const index = global.conns.indexOf(sock)
        if (index > -1) global.conns.splice(index, 1)

        const botJid = sock.user?.jid
        if (botJid) {
            global.subBots.delete(botJid)
            global.subBotsData.delete(botJid)
        }
        global.subBots.delete(uid)
        global.subBotsData.delete(uid)
        global.sentCodes.delete(uid)

        if (fullCleanup && !isConnected) {
            safeRmDir(sessionPath)
            global.subBotReconnectAttempts.delete(uid)
        }
    }

    if (!isAutoStart) {
        connectionTimer = setTimeout(async () => {
            if (!isConnected) {
                await cleanup(true)
                if (conn && m) {
                    await conn.sendMessage(m.chat, {
                        text: '⏰ Tiempo de conexión agotado. Intenta de nuevo.'
                    }, { quoted: m }).catch(() => { })
                }
            }
        }, CONNECTION_TIMEOUT)
    }

    async function handlePairingCode() {
        try {
            const phoneNumber = uid.replace(/\D/g, '')
            const secret = await sock.requestPairingCode(phoneNumber)

            if (!secret) throw new Error('No se pudo generar el código')

            const formatted = secret.match(/.{1,4}/g)?.join('-') || secret
            const botName = global.botname || 'AstaBot'

            if (conn && m && m.chat) {
                await conn.sendMessage(m.chat, {
                    image: { url: 'https://files.catbox.moe/gptlxc.jpg' },
                    caption: MSG_CODE
                }, { quoted: m })

                const codeMsg = await sendCodeCopyButton(conn, m.chat, formatted, botName, m)

                if (codeMsg?.key) {
                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: codeMsg.key }).catch(() => { })
                    }, CODE_EXPIRY)
                }
            }
        } catch (error) {
            console.error(chalk.red(`❌ Error generando código para ${uid}:`), error.message)
            if (conn && m && m.chat && !isAutoStart) {
                await conn.sendMessage(m.chat, {
                    text: `❌ Error generando código: ${error.message}`
                }, { quoted: m }).catch(() => { })
            }
            await cleanup(true)
        }
    }

    async function handleQRCode() {
        try {
            if (!currentQR) return

            const qrBuffer = await qrcode.toBuffer(currentQR, {
                scale: 8,
                margin: 2,
                errorCorrectionLevel: 'H'
            })

            if (conn && m && m.chat) {
                const qrMsg = await conn.sendMessage(m.chat, {
                    image: qrBuffer,
                    caption: MSG_QR
                }, { quoted: m })

                if (qrMsg?.key) {
                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: qrMsg.key }).catch(() => { })
                    }, QR_EXPIRY)
                }
            }
        } catch (error) {
            console.error(chalk.red(`❌ Error generando QR para ${uid}:`), error.message)
            await cleanup(true)
        }
    }

    async function handleOpenConnection() {
        isConnected = true
        reconnectAttempts = 0
        global.subBotReconnectAttempts.delete(uid)

        if (connectionTimer) clearTimeout(connectionTimer)
        if (qrTimer) clearTimeout(qrTimer)

        await delay(1000)

        const userJid = sock.user?.jid || `${uid}@s.whatsapp.net`
        const userNum = userJid.split('@')[0]
        const userName = sock.user?.name || 'SubBot'

        if (!global.conns.includes(sock)) global.conns.push(sock)

        global.subBots.set(userJid, sock)
        global.subBots.set(uid, sock)
        global.subBots.set(userNum, sock)

        const botData = {
            owner: sock.ownerId,
            connectedAt: Date.now(),
            name: userName,
            userId: uid,
            jid: userJid,
            state: 'connected'
        }

        global.subBotsData.set(userJid, botData)
        global.subBotsData.set(uid, botData)
        global.subBotsData.set(userNum, botData)

        config.jid = userJid
        config.name = config.name || userName
        saveSubConfig(uid, config)
        sock.subConfig = getSubConfig(uid)

        console.log(chalk.green.bold(
            `\n✅ SUB-BOT CONECTADO\n` +
            `├─ Nombre: ${userName}\n` +
            `├─ JID: ${userJid}\n` +
            `└─ Owner: ${sock.ownerId}\n`
        ))

        await setupSubBotHandler(sock, uid)

        if (!isAutoStart && conn && m && m.chat) {
            await conn.sendMessage(m.chat, {
                text: `✅ *Sub-Bot Conectado!*\n\n` +
                    `🤖 ${userName}\n` +
                    `📱 ${userNum}\n` +
                    `👤 Owner: @${sock.ownerId}\n\n` +
                    `⚙️ Config: *.config*\n` +
                    `🗑️ Eliminar: *.delsub*`,
                mentions: [m.sender]
            }).catch(() => { })
        }

        if (global.IDchannel) {
            await sock.newsletterFollow(global.IDchannel).catch(() => { })
        }
    }

    async function handleCloseConnection(lastDisconnect) {
        const statusCode = lastDisconnect?.error?.output?.statusCode

        const botJid = sock.user?.jid
        if (botJid && global.subBotsData.has(botJid)) {
            const data = global.subBotsData.get(botJid)
            data.state = 'disconnected'
            data.disconnectedAt = Date.now()
            global.subBotsData.set(botJid, data)
        }

        const invalidCodes = [DisconnectReason.loggedOut, 401, 403, 405]
        if (invalidCodes.includes(statusCode)) {
            console.log(chalk.red(`🗑️ Sesión inválida (${statusCode}), limpiando: ${uid}`))
            await cleanup(true)
            return
        }

        if (!isConnected || statusCode === 515) {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++
                global.subBotReconnectAttempts.set(uid, reconnectAttempts)

                console.log(chalk.yellow(
                    `🔄 Reconectando sub-bot ${uid} (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
                ))

                await cleanup(false)
                await delay(RECONNECT_DELAY_BASE * reconnectAttempts)

                await createSubBot({
                    sessionPath,
                    m,
                    conn,
                    userId,
                    isAutoStart: true,
                    mcode,
                    savedConfig: getSubConfig(uid)
                })
            } else {
                console.log(chalk.red(`❌ Máximo de reintentos alcanzado para ${uid}`))
                await cleanup(true)
            }
            return
        }

        const index = global.conns.indexOf(sock)
        if (index > -1) global.conns.splice(index, 1)
    }

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr) currentQR = qr

        if (qr && !sock.user && !codeSent) {
            codeSent = true
            global.sentCodes.set(uid, {
                timestamp: Date.now(),
                type: mcode ? 'code' : 'qr'
            })

            if (mcode) {
                await handlePairingCode()
            } else {
                await handleQRCode()
            }
            return
        }

        if (connection === 'open') {
            await handleOpenConnection()
        }

        if (connection === 'close') {
            await handleCloseConnection(lastDisconnect)
        }
    }

    sock.ev.on('connection.update', connectionUpdate)
    if (saveCreds) {
        sock.ev.on('creds.update', saveCreds)
    }

    return sock
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-INICIAR SUB-BOTS
// ═══════════════════════════════════════════════════════════════════
export async function autoStartSubBots() {
    ensureDirectory(SUBBOT_FOLDER)

    let sessions = []
    try {
        sessions = fs.readdirSync(SUBBOT_FOLDER).filter(f => {
            const fullPath = path.join(SUBBOT_FOLDER, f)
            return fs.statSync(fullPath).isDirectory() &&
                fs.existsSync(path.join(fullPath, 'creds.json'))
        })
    } catch {
        console.log(chalk.gray('📭 Sin sub-bots guardados.'))
        return
    }

    if (!sessions.length) {
        console.log(chalk.gray('📭 Sin sub-bots guardados.'))
        return
    }

    console.log(chalk.cyan(`\n🔄 Restaurando ${sessions.length} sub-bot(s)...`))

    for (const userId of sessions) {
        try {
            await cleanSubBotCache(userId)

            const sessionPath = path.join(SUBBOT_FOLDER, userId)
            const savedConfig = getSubConfig(userId)

            console.log(chalk.blue(`  ↳ Iniciando: ${userId}`))

            await createSubBot({
                sessionPath,
                m: null,
                conn: null,
                userId,
                isAutoStart: true,
                mcode: false,
                savedConfig
            })

            await delay(2500)
        } catch (error) {
            console.error(chalk.red(`  ✖ Error restaurando ${userId}:`), error.message)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
const handler = async (m, { conn, args, command }) => {
    const userId = cleanNum(m.sender)
    const mcode = command === 'code' || args.includes('code')

    if (!conn) {
        console.error(chalk.red('❌ Error: conn no disponible'))
        return
    }

    if (isSubBotConnected(userId)) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ya tienes un Sub-Bot activo.\nUsa *.delsub* para eliminarlo.`
        }, { quoted: m })
    }

    let userCount = 0
    for (const [, data] of global.subBotsData) {
        if (data?.owner && cleanNum(data.owner) === userId) {
            userCount++
        }
    }

    if (userCount >= MAX_SUBBOTS_PER_USER) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Máximo *${MAX_SUBBOTS_PER_USER}* sub-bots por usuario.`
        }, { quoted: m })
    }

    const sessionPath = path.join(SUBBOT_FOLDER, userId)

    if (fs.existsSync(sessionPath)) {
        const configPath = path.join(sessionPath, 'config.json')
        if (!fs.existsSync(configPath)) {
            safeRmDir(sessionPath)
            await delay(500)
        }
    }

    ensureDirectory(sessionPath)

    await conn.sendMessage(m.chat, {
        text: `⏳ *Generando ${mcode ? 'código' : 'QR'}...*`
    }, { quoted: m })

    await createSubBot({
        sessionPath,
        m,
        conn,
        userId,
        isAutoStart: false,
        mcode
    })
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code', 'subbot']

export default handler