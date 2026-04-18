import pkg from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'

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
│  ⏳  *Expira en 60 segundos.*
╰────────────────────────╯`

if (!global.conns || !Array.isArray(global.conns)) global.conns = []
if (!global.activeSubBots) global.activeSubBots = new Map()
if (!global.sentCodes) global.sentCodes = new Map()

const SUBBOT_FOLDER = './sessions/subbots'

function normalize(num) {
    return String(num).replace(/[^0-9]/g, '')
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function isSubBotConnected(jid) {
    if (!global.conns || !Array.isArray(global.conns)) return false
    const targetJid = jid.split('@')[0]
    return global.conns.some(sock => {
        try {
            if (!sock || !sock.user || !sock.user.jid) return false
            const sockId = sock.user.jid.split('@')[0]
            return sockId === targetJid && sock.ws && sock.ws.readyState === 1
        } catch { return false }
    })
}

async function sendCodeCopyButton(conn, jid, code, botName, quoted) {
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
}

async function createSubBot(options) {
    let {
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId,
        isAutoStart = false,
        mcode = false
    } = options

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
            await conn.sendMessage(m.chat, { text: '❌ Error al iniciar sesión. Intenta de nuevo.' }, { quoted: m })
        }
        return
    }

    const sock = makeWASocket({
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
        keepAliveIntervalMs: 30000
    })

    sock.userId = userId

    let qrTimer = null
    let connectionTimer = null
    let cleanupTimer = null
    let codeSent = false
    let isConnected = false

    const cleanup = async () => {
        if (qrTimer) clearTimeout(qrTimer)
        if (connectionTimer) clearTimeout(connectionTimer)
        if (cleanupTimer) clearTimeout(cleanupTimer)
        
        try {
            sock.ev.removeAllListeners()
            if (sock.ws?.readyState === 1) sock.ws.close()
        } catch (e) {}
        
        const index = global.conns.indexOf(sock)
        if (index > -1) global.conns.splice(index, 1)
        global.activeSubBots.delete(sock.user?.jid)
        global.sentCodes.delete(userId)
        
        if (!isConnected) {
            try {
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true })
                }
            } catch (e) {}
        }
    }

    connectionTimer = setTimeout(async () => {
        if (!isConnected && !isAutoStart) {
            console.log(chalk.yellow(`⏰ Timeout de conexión para ${userId}`))
            await cleanup()
            if (m) await conn.sendMessage(m.chat, { text: '⏰ Tiempo de espera agotado (60s). Intenta nuevamente.' }, { quoted: m })
        }
    }, 60000)

    async function connectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update

        if (qr && !sock.user && !codeSent) {
            codeSent = true
            global.sentCodes.set(userId, { timestamp: Date.now(), type: mcode ? 'code' : 'qr' })

            if (mcode) {
                try {
                    const secret = await sock.requestPairingCode(userId)
                    const formattedCode = secret.match(/.{1,4}/g)?.join('-') || secret
                    const botName = global.namebot || 'AstaBot'

                    await conn.sendMessage(m.chat, {
                        image: { url: imagenSerBot },
                        caption: mensajeCode.trim()
                    }, { quoted: m })

                    const codeMsg = await sendCodeCopyButton(conn, m.chat, formattedCode, botName, m)

                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: codeMsg.key }).catch(() => {})
                    }, 55000)

                } catch (e) {
                    console.error('Error pairing code:', e)
                    if (m) await conn.sendMessage(m.chat, { text: '❌ Error generando código. Usa *.qr*' }, { quoted: m })
                    await cleanup()
                }

            } else {
                try {
                    const qrBuffer = await qrcode.toBuffer(qr, { scale: 8, margin: 2, errorCorrectionLevel: 'H' })

                    const qrMsg = await conn.sendMessage(m.chat, {
                        image: qrBuffer,
                        caption: mensajeQR.trim()
                    }, { quoted: m })

                    qrTimer = setTimeout(() => {
                        conn.sendMessage(m.chat, { delete: qrMsg.key }).catch(() => {})
                    }, 55000)

                } catch (e) {
                    console.error('Error generando QR:', e)
                    await cleanup()
                }
            }
            return
        }

        if (connection === 'open') {
            isConnected = true
            if (connectionTimer) clearTimeout(connectionTimer)
            if (qrTimer) clearTimeout(qrTimer)

            if (!global.conns.includes(sock)) global.conns.push(sock)
            global.activeSubBots.set(sock.user.jid, { socket: sock, userId, connectedAt: Date.now() })

            console.log(chalk.green.bold(`\n✅ SUBBOT CONECTADO\n├─ User: ${sock.user.name}\n├─ JID: ${sock.user.jid}\n└─ ID: ${userId}\n`))

            if (!isAutoStart && m?.chat) {
                await conn.sendMessage(m.chat, {
                    text: `✅ *SubBot Conectado!*\n\n🤖 ${sock.user.name}\n📱 ${sock.user.jid.split('@')[0]}`,
                    mentions: [m.sender]
                }).catch(() => {})
            }

            if (global.IDchannel) {
                await sock.newsletterFollow(global.IDchannel).catch(() => {})
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
            console.log(chalk.yellow(`🔌 SubBot ${userId} desconectado: ${statusCode}`))

            if (!isConnected) {
                await cleanup()
                if (m && !isAutoStart) {
                    await conn.sendMessage(m.chat, { text: `❌ No se pudo conectar. Usa *${usedPrefix}${mcode ? 'code' : 'qr'}* de nuevo.` }, { quoted: m })
                }
            } else {
                const index = global.conns.indexOf(sock)
                if (index > -1) global.conns.splice(index, 1)
                global.activeSubBots.delete(sock.user?.jid)
            }
        }
    }

    sock.ev.on('connection.update', connectionUpdate)
    
    if (saveCreds) {
        sock.ev.on('creds.update', saveCreds)
    }

    try {
        const handlerModule = await import('../../lib/handler.js')
        if (handlerModule?.handler) {
            sock.handler = handlerModule.handler.bind(sock)
            sock.ev.on('messages.upsert', sock.handler)
        }
    } catch (e) {}
}

export async function autoStartSubBots() {
    // DESACTIVADO - No restaurar subbots automáticamente para evitar errores
    console.log(chalk.gray('📭 Auto-restauración de subbots desactivada.'))
    return
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const userId = m.sender.split('@')[0]
    const mcode = command === 'code' || args.includes('code')

    if (isSubBotConnected(m.sender)) {
        return conn.sendMessage(m.chat, {
            text: `⚠️ Ya tienes un SubBot activo.\n\nUsa *${usedPrefix}delsub ${userId}* para eliminarlo.`
        }, { quoted: m })
    }

    const sessionPath = path.join(SUBBOT_FOLDER, userId)

    if (fs.existsSync(sessionPath)) {
        try { 
            fs.rmSync(sessionPath, { recursive: true, force: true }) 
        } catch (e) {}
        await delay(1000)
    }

    try {
        fs.mkdirSync(sessionPath, { recursive: true })
    } catch (e) {
        return conn.sendMessage(m.chat, { text: '❌ Error al crear sesión. Intenta de nuevo.' }, { quoted: m })
    }
    
    global.sentCodes.delete(userId)

    await conn.sendMessage(m.chat, { 
        text: `⏳ *Generando ${mcode ? 'código' : 'QR'}...*\n⏰ Tienes 60 segundos para vincular.` 
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
