import pkg from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'

const {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    generateWAMessageFromContent,
    proto,
    WA_DEFAULT_EPHEMERAL,
    default: makeWASocket
} = pkg

const imagenSerBot = 'https://files.catbox.moe/gptlxc.jpg'

const mensajeQR = `╭─〔 💻 𝘼𝙎𝙏𝘼 𝘽𝙊𝙏 • 𝙈𝙊𝘿𝙊 𝙌𝙍 〕─╮
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
│  ⏳  *Expira en 60 segundos.*
╰────────────────────────╯`

if (!global.conns) global.conns = []
if (!global.subBots) global.subBots = new Map()
if (!global.subBotsData) global.subBotsData = new Map()
if (!global.sentCodes) global.sentCodes = new Map()
if (!global.subBotReconnectAttempts) global.subBotReconnectAttempts = new Map()

const SUBBOT_FOLDER = './session/Sub-bots'

const SILENT_ERRORS = [
    'Bad MAC', 'Failed to decrypt', 'Session error', 'decryptWithSessions',
    'verifyMAC', 'SessionEntry', 'Closing session', 'Closing open session',
    'Closing stale open session', '_chains:', 'chainKey', 'chainType',
    'messageKeys', 'currentRatchet', 'ephemeralKeyPair', 'lastRemoteEphemeralKey',
    'rootKey', 'indexInfo', 'baseKey', 'baseKeyType', 'pendingPreKey', 'registrationId',
    'stream errored', 'connection closed'
]

const originalError = console.error
console.error = function(...args) {
    const msg = args.join(' ')
    if (SILENT_ERRORS.some(p => msg.includes(p))) return
    originalError.apply(console, args)
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function isSubBotConnected(jid) {
    if (!global.subBots?.size) return false
    const targetJid = String(jid).replace(/[^0-9]/g, '')
    for (const [id, sock] of global.subBots) {
        try {
            if (!sock?.user) continue
            const sockId = String(sock.user.jid || sock.user.id || id).replace(/[^0-9]/g, '')
            if (sockId === targetJid) {
                return sock.ws && (sock.ws.readyState === 1 || sock.ws.readyState === 'OPEN') && (sock.user?.jid || sock.user?.id)
            }
        } catch { continue }
    }
    return false
}

async function sendCodeCopyButton(conn, jid, code, botName, quoted) {
    try {
        const interactiveMessage = {
            body: { text: '📋 Presiona el botón para copiar tu código' },
            footer: { text: botName },
            header: { title: code, hasMediaAttachment: false },
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
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
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
    } catch (e) {
        await conn.sendMessage(jid, { 
            text: `📋 *Código:* \`${code}\`\n\n_Toca y mantén para copiar_` 
        }, { quoted })
    }
}

async function setupSubBotHandler(sock, userId, conn) {
    sock.isSubBot = true
    sock.isMainBot = false
    sock.ownerId = userId

    // CORRECCIÓN: Cargar handler y comandos igual que el bot principal
    let handlerModule = null
    const handlerPath = path.join(process.cwd(), 'lib', 'message-handler.js')
    try {
        handlerModule = await import(pathToFileURL(handlerPath).href)
    } catch (e) {
        console.error(chalk.red(`❌ Handler no encontrado para sub-bot ${userId}:`), e.message)
        return
    }

    if (!handlerModule?.handleMessage) {
        console.error(chalk.red(`❌ handleMessage no exportado correctamente para sub-bot ${userId}`))
        return
    }

    // CORRECCIÓN: Cargar los comandos para que el sub-bot los pueda ejecutar
    let commands = new Map()
    try {
        const { loadCommands } = await import(pathToFileURL(path.join(process.cwd(), 'lib', 'loader.js')).href)
        const commandsDir = path.join(process.cwd(), 'src', 'commands')
        const archivos = loadCommands(commandsDir)
        for (const filePath of archivos) {
            try {
                const mod = await import(pathToFileURL(filePath).href)
                const plugin = mod.default || mod
                if (!plugin?.command) continue
                const cmds = [
                    ...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]),
                    ...(Array.isArray(plugin.aliases) ? plugin.aliases : [])
                ].map(c => c.toLowerCase())
                for (const cmd of cmds) {
                    commands.set(cmd, { plugin, filePath })
                }
            } catch (_) {}
        }
    } catch (e) {
        console.error(chalk.yellow(`⚠️ Error cargando comandos para sub-bot ${userId}:`), e.message)
    }

    const processedMessages = new NodeCache({ stdTTL: 30, checkperiod: 60 })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m?.messages?.length) return
            const msg = m.messages[0]
            if (!msg?.message) return

            // Deduplicación de mensajes
            const botId = sock.user?.jid || sock.user?.id || 'unknown'
            const messageId = msg.key?.id
            if (!messageId) return
            const uniqueKey = `${botId}:${messageId}`
            if (processedMessages.has(uniqueKey)) return
            processedMessages.set(uniqueKey, true)

            if (msg.key?.remoteJid === 'status@broadcast') return
            if (msg.message?.protocolMessage) return
            if (msg.message?.senderKeyDistributionMessage) return

            await handlerModule.handleMessage(sock, msg, commands)
        } catch (err) {
            const errMsg = err?.message || ''
            if (!SILENT_ERRORS.some(p => errMsg.includes(p))) {
                console.error(chalk.yellow(`⚠️ Error en sub-bot ${userId}:`), errMsg.substring(0, 100))
            }
        }
    })

    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { onGroupUpdate } = await import('../group/group-events.js')
            await onGroupUpdate(sock, update)
        } catch (e) {}
    })

    console.log(chalk.green(`✅ Handler + ${commands.size} comandos cargados para sub-bot ${userId}`))
}

export async function createSubBot(options) {
    let {
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId,
        isAutoStart = false,
        mcode = false
    } = options

    const ownerId = String(m?.sender || userId).replace(/[^0-9]/g, '')

    const { version } = await fetchLatestBaileysVersion()
    const msgRetryCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })

    let state, saveCreds
    try {
        const auth = await useMultiFileAuthState(sessionPath)
        state = auth.state
        saveCreds = auth.saveCreds
    } catch (e) {
        console.error('Error cargando auth state:', e.message)
        if (m && !isAutoStart) {
            await conn.sendMessage(m.chat, { text: '❌ Error al iniciar sesión.' }, { quoted: m })
        }
        return
    }

    let sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        msgRetryCounterCache: msgRetryCache,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
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

    sock.userId = userId
    sock.isSubBot = true
    sock.isMainBot = false
    sock.ownerId = ownerId

    let qrTimer = null
    let connectionTimer = null
    let codeSent = false
    let isConnected = false
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3

    const cleanup = async (fullCleanup = false) => {
        if (qrTimer) clearTimeout(qrTimer)
        if (connectionTimer) clearTimeout(connectionTimer)

        try {
            sock.ev.removeAllListeners()
            if (sock.ws?.readyState === 1) sock.ws.close()
        } catch (e) {}

        const index = global.conns.indexOf(sock)
        if (index > -1) global.conns.splice(index, 1)

        const botJid = sock.user?.jid
        if (botJid) {
            global.subBots.delete(botJid)
            global.subBotsData.delete(botJid)
        }
        global.subBots.delete(userId)
        global.subBotsData.delete(userId)
        global.sentCodes.delete(userId)

        if (fullCleanup && !isConnected) {
            try {
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true })
                }
            } catch (e) {}
        }
    }

    connectionTimer = setTimeout(async () => {
        if (!isConnected && !isAutoStart) {
            await cleanup(true)
            if (m) await conn.sendMessage(m.chat, { text: '⏰ Tiempo agotado.' }, { quoted: m })
        }
    }, 60000)

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr && !sock.user && !codeSent) {
            codeSent = true
            global.sentCodes.set(userId, { timestamp: Date.now(), type: mcode ? 'code' : 'qr' })

            if (mcode) {
                // CORRECCIÓN: El número para requestPairingCode debe ser el número
                // limpio con código de país, en formato E.164 (sin @s.whatsapp.net)
                const numeroParaCodigo = String(userId).replace(/[^0-9]/g, '')
                try {
                    const secret = await sock.requestPairingCode(numeroParaCodigo)
                    const formattedCode = secret?.match(/.{1,4}/g)?.join("-") || secret
                    const botName = global.namebot || 'AstaBot'

                    await conn.sendMessage(m.chat, {
                        image: { url: imagenSerBot },
                        caption: mensajeCode.trim()
                    }, { quoted: m })

                    const codeMsg = await sendCodeCopyButton(conn, m.chat, formattedCode, botName, m)

                    if (codeMsg?.key) {
                        qrTimer = setTimeout(() => {
                            conn.sendMessage(m.chat, { delete: codeMsg.key }).catch(() => {})
                        }, 55000)
                    }

                } catch (e) {
                    console.error(chalk.red('❌ Error requestPairingCode:'), e.message)
                    if (m) await conn.sendMessage(m.chat, { text: `❌ Error generando código: ${e.message}` }, { quoted: m })
                    await cleanup(true)
                }
            } else {
                try {
                    const qrBuffer = await qrcode.toBuffer(qr, { scale: 8, margin: 2, errorCorrectionLevel: 'H' })
                    const qrMsg = await conn.sendMessage(m.chat, {
                        image: qrBuffer,
                        caption: mensajeQR.trim()
                    }, { quoted: m })

                    if (qrMsg?.key) {
                        qrTimer = setTimeout(() => {
                            conn.sendMessage(m.chat, { delete: qrMsg.key }).catch(() => {})
                        }, 55000)
                    }
                } catch (e) {
                    console.error(chalk.red('❌ Error generando QR:'), e.message)
                    await cleanup(true)
                }
            }
            return
        }

        if (connection === 'open') {
            isConnected = true
            reconnectAttempts = 0
            if (connectionTimer) clearTimeout(connectionTimer)
            if (qrTimer) clearTimeout(qrTimer)

            await delay(1000)

            const userName = sock.user?.name || 'SubBot'
            const userJid = sock.user?.jid || `${userId}@s.whatsapp.net`
            const userNumber = userJid.split('@')[0]

            if (!global.conns.includes(sock)) global.conns.push(sock)

            global.subBots.set(userJid, sock)
            global.subBots.set(userId, sock)
            global.subBots.set(userNumber, sock)

            const botData = {
                owner: ownerId,
                connectedAt: Date.now(),
                name: userName,
                userId: userId,
                jid: userJid,
                wsReady: true,
                state: 'connected'
            }

            global.subBotsData.set(userJid, botData)
            global.subBotsData.set(userId, botData)
            global.subBotsData.set(userNumber, botData)

            console.log(chalk.green.bold(`\n✅ SUBBOT CONECTADO\n├─ User: ${userName}\n├─ JID: ${userJid}\n└─ Owner: ${ownerId}\n`))

            await setupSubBotHandler(sock, userId, conn)

            if (!isAutoStart && m?.chat) {
                try {
                    await conn.sendMessage(m.chat, { 
                        text: `✅ *SubBot Conectado!*\n\n🤖 ${userName}\n📱 ${userNumber}`,
                        mentions: [m.sender] 
                    })
                } catch (e) {}
            }

            if (global.IDchannel) {
                await sock.newsletterFollow(global.IDchannel).catch(() => {})
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            const botJid = sock.user?.jid
            if (botJid && global.subBotsData.has(botJid)) {
                const data = global.subBotsData.get(botJid)
                data.state = 'disconnected'
                data.wsReady = false
                global.subBotsData.set(botJid, data)
            }

            if (statusCode === 515 && reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++
                console.log(chalk.yellow(`🔄 Error 515. Reconectando... (${reconnectAttempts}/${maxReconnectAttempts})`))

                await delay(5000 * reconnectAttempts)

                try {
                    const { state: newState, saveCreds: newSaveCreds } = await useMultiFileAuthState(sessionPath)

                    if (!newState.creds.registered) {
                        await cleanup(true)
                        return
                    }

                    const newSock = makeWASocket({
                        logger: pino({ level: 'silent' }),
                        printQRInTerminal: false,
                        auth: {
                            creds: newState.creds,
                            keys: makeCacheableSignalKeyStore(newState.keys, pino({ level: 'fatal' }))
                        },
                        msgRetryCounterCache: msgRetryCache,
                        browser: ['Ubuntu', 'Chrome', '20.0.04'],
                        version,
                        generateHighQualityLinkPreview: true,
                        defaultQueryTimeoutMs: 60000,
                        connectTimeoutMs: 60000,
                        keepAliveIntervalMs: 30000
                    })

                    newSock.userId = userId
                    newSock.isSubBot = true
                    newSock.isMainBot = false
                    newSock.ownerId = ownerId

                    newSock.ev.on('creds.update', newSaveCreds)
                    newSock.ev.on('connection.update', connectionUpdate)

                    await setupSubBotHandler(newSock, userId, conn)

                    const oldIndex = global.conns.indexOf(sock)
                    if (oldIndex > -1) global.conns[oldIndex] = newSock

                    if (botJid) global.subBots.delete(botJid)
                    global.subBots.set(userId, newSock)

                    sock = newSock

                } catch (err) {
                    await cleanup(true)
                }
                return
            }

            if (!isConnected) {
                await cleanup(true)
            } else {
                const index = global.conns.indexOf(sock)
                if (index > -1) global.conns.splice(index, 1)
            }
        }
    }

    sock.ev.on('connection.update', connectionUpdate)
    if (saveCreds) sock.ev.on('creds.update', saveCreds)
}

export async function autoStartSubBots() {
    console.log(chalk.gray('📭 Auto-restauración desactivada.'))
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const userId = String(m.sender).replace(/[^0-9]/g, '')
    const mcode = command === 'code' || args.includes('code')

    let userSubBotCount = 0

    for (const [key, data] of global.subBotsData || []) {
        if (data?.owner && String(data.owner).replace(/[^0-9]/g, '') === userId) {
            userSubBotCount++
        }
    }

    const MAX_SUBBOTS = 3
    if (userSubBotCount >= MAX_SUBBOTS) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Máximo ${MAX_SUBBOTS} sub-bots.\nElimina con *${usedPrefix}delsub*`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    if (isSubBotConnected(m.sender)) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ya tienes un SubBot activo.\nUsa *${usedPrefix}delsub* para eliminarlo.`
        }, { quoted: m })
    }

    const sessionPath = path.join(SUBBOT_FOLDER, userId)

    if (fs.existsSync(sessionPath)) {
        try { fs.rmSync(sessionPath, { recursive: true, force: true }) } catch (e) {}
        await delay(1000)
    }

    try {
        fs.mkdirSync(sessionPath, { recursive: true })
    } catch (e) {
        return conn.sendMessage(m.chat, { text: '❌ Error al crear sesión.' }, { quoted: m })
    }

    global.sentCodes.delete(userId)

    await conn.sendMessage(m.chat, { 
        text: `⏳ *Generando ${mcode ? 'código' : 'QR'}...*` 
    }, { quoted: m })

    await createSubBot({
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId,
        isAutoStart: false,
        mcode
    })
}

handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']

export default handler
