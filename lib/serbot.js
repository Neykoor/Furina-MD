import pkg from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import NodeCache from 'node-cache'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import chalk from 'chalk'
import { pathToFileURL, fileURLToPath } from 'url'

const {
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    default: makeWASocket,
    Browsers
} = pkg

const SUBBOT_FOLDER = path.join(process.cwd(), 'session', 'Sub-bots')
const WEB_CONNECTION_TIMEOUT = 90000
const WEB_QR_EXPIRY = 45000
const WEB_CODE_EXPIRY = 60000
const MAX_WEB_RECONNECT_ATTEMPTS = 2

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

const _origError = console.error
const _origLog = console.log
const _origWarn = console.warn

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
            } catch { return false }
        }
        return false
    })
}

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

if (!global.conns) global.conns = []
if (!global.subBots) global.subBots = new Map()
if (!global.subBotsData) global.subBotsData = new Map()
if (!global.sentCodes) global.sentCodes = new Map()
if (!global.webPendingConnections) global.webPendingConnections = new Map()

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

function safeRmDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true })
    } catch { }
}

function defaultSubConfig(userId, webOwner = null) {
    return {
        name: global.botname || 'Asta Bot',
        mode: 'public',
        antiPrivate: false,
        antiSpam: true,
        cooldown: 3000,
        logoUrl: null,
        logos: {},
        owner: webOwner,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        source: 'web'
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
        if (!sock) sock = global.subBots.get(`${uid}@s.whatsapp.net`)
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
        try {
            const fp = path.join(sessionPath, file)
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
        } catch { }
    }

    try {
        const files = fs.readdirSync(sessionPath)
        for (const file of files) {
            if (file.endsWith('.tmp') || file.endsWith('.log')) {
                try { fs.unlinkSync(path.join(sessionPath, file)) } catch { }
            }
        }
    } catch { }
}

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

class WebConnectionController {
    constructor(phoneNumber, type, callbacks) {
        this.phoneNumber = cleanNum(phoneNumber)
        this.type = type
        this.callbacks = callbacks
        this.status = 'pending'
        this.socket = null
        this.qrData = null
        this.codeData = null
        this.createdAt = Date.now()
        this.connectionTimer = null
        this.qrTimer = null
        this.reconnectAttempts = 0
        this.isConnected = false
        this.codeRequested = false
    }

    async start() {
        const uid = this.phoneNumber
        const sessionPath = path.join(SUBBOT_FOLDER, uid)

        if (isSubBotConnected(uid)) {
            this.status = 'error'
            this.callbacks?.onError?.('Este número ya tiene un bot activo')
            return null
        }

        ensureDirectory(sessionPath)
        global.sentCodes.delete(uid)

        let state, saveCreds
        try {
            const auth = await useMultiFileAuthState(sessionPath)
            state = auth.state
            saveCreds = auth.saveCreds
        } catch (error) {
            this.status = 'error'
            this.callbacks?.onError?.('Error al iniciar sesión: ' + error.message)
            return null
        }

        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 0] }))
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

        this.socket = sock

        const config = {
            ...defaultSubConfig(uid, null),
            ...getSubConfig(uid),
            source: 'web'
        }

        Object.assign(sock, {
            userId: uid,
            sessionPath,
            isSubBot: true,
            isMainBot: false,
            ownerId: null,
            subConfig: config,
            webConnection: true
        })

        this.connectionTimer = setTimeout(() => {
            if (!this.isConnected) {
                this.cleanup(true)
                this.status = 'timeout'
                this.callbacks?.onTimeout?.()
            }
        }, WEB_CONNECTION_TIMEOUT)

        const handleConnectionUpdate = async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr && !sock.user && !this.codeRequested) {
                this.codeRequested = true
                this.qrData = qr
                global.sentCodes.set(uid, {
                    qr, timestamp: Date.now(),
                    type: this.type
                })

                if (this.type === 'code') {
                    await this.handlePairingCode(sock, saveCreds)
                } else {
                    await this.handleQR(sock)
                }
                return
            }

            if (connection === 'open') {
                await this.handleOpen(sock, saveCreds)
            }

            if (connection === 'close') {
                await this.handleClose(lastDisconnect)
            }
        }

        sock.ev.on('connection.update', handleConnectionUpdate)
        if (saveCreds) {
            sock.ev.on('creds.update', saveCreds)
        }

        global.webPendingConnections.set(uid, this)

        return this
    }

    async handlePairingCode(sock, saveCreds) {
        try {
            const phoneNumber = this.phoneNumber
            const secret = await sock.requestPairingCode(phoneNumber)

            if (!secret) throw new Error('No se pudo generar el código')

            const formatted = secret.match(/.{1,4}/g)?.join('-') || secret

            this.codeData = { raw: secret, formatted }
            this.status = 'code'

            global.sentCodes.set(this.phoneNumber, {
                code: secret,
                formatted,
                timestamp: Date.now(),
                type: 'code'
            })

            this.callbacks?.onCode?.(formatted, secret)

        } catch (error) {
            console.error(chalk.red(`❌ Error código web ${this.phoneNumber}:`), error.message)
            this.status = 'error'
            this.callbacks?.onError?.(error.message)
            this.cleanup(true)
        }
    }

    async handleQR(sock) {
        try {
            if (!this.qrData) return

            this.status = 'qr'

            const qrBuffer = await QRCode.toBuffer(this.qrData, {
                scale: 8,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: { dark: '#00ff88', light: '#0a0a0a' }
            })

            this.callbacks?.onQR?.(this.qrData, qrBuffer.toString('base64'))

            this.qrTimer = setTimeout(() => {
                if (!this.isConnected) {
                    this.callbacks?.onError?.('QR expirado')
                    this.cleanup(true)
                }
            }, WEB_QR_EXPIRY)

        } catch (error) {
            console.error(chalk.red(`❌ Error QR web ${this.phoneNumber}:`), error.message)
            this.status = 'error'
            this.callbacks?.onError?.(error.message)
            this.cleanup(true)
        }
    }

    async handleOpen(sock, saveCreds) {
        this.isConnected = true
        this.status = 'connected'

        if (this.connectionTimer) clearTimeout(this.connectionTimer)
        if (this.qrTimer) clearTimeout(this.qrTimer)

        await delay(1000)

        const userJid = sock.user?.jid || `${this.phoneNumber}@s.whatsapp.net`
        const userNum = userJid.split('@')[0]
        const userName = sock.user?.name || 'SubBot'

        if (!global.conns.includes(sock)) global.conns.push(sock)

        global.subBots.set(userJid, sock)
        global.subBots.set(this.phoneNumber, sock)
        global.subBots.set(userNum, sock)

        const botData = {
            owner: sock.ownerId,
            connectedAt: Date.now(),
            name: userName,
            userId: this.phoneNumber,
            jid: userJid,
            state: 'connected',
            source: 'web'
        }

        global.subBotsData.set(userJid, botData)
        global.subBotsData.set(this.phoneNumber, botData)
        global.subBotsData.set(userNum, botData)

        const currentConfig = getSubConfig(this.phoneNumber)
        currentConfig.jid = userJid
        currentConfig.name = currentConfig.name || userName
        saveSubConfig(this.phoneNumber, currentConfig)
        sock.subConfig = getSubConfig(this.phoneNumber)

        console.log(chalk.green.bold(
            `\n🌐 SUB-BOT WEB CONECTADO\n` +
            `├─ Nombre: ${userName}\n` +
            `├─ JID: ${userJid}\n` +
            `└─ Origen: Web Dashboard\n`
        ))

        this.callbacks?.onConnected?.({
            jid: userJid,
            name: userName,
            number: userNum
        })

        global.webPendingConnections.delete(this.phoneNumber)

        await this.setupMessageHandler(sock)
    }

    async handleClose(lastDisconnect) {
        const statusCode = lastDisconnect?.error?.output?.statusCode

        const botJid = this.socket?.user?.jid
        if (botJid && global.subBotsData.has(botJid)) {
            const data = global.subBotsData.get(botJid)
            data.state = 'disconnected'
            data.disconnectedAt = Date.now()
            global.subBotsData.set(botJid, data)
        }

        const invalidCodes = [DisconnectReason.loggedOut, 401, 403, 405]
        if (invalidCodes.includes(statusCode)) {
            console.log(chalk.red(`🗑️ Sesión web inválida (${statusCode}), limpiando: ${this.phoneNumber}`))
            this.callbacks?.onError?.(`Sesión inválida (${statusCode})`)
            this.cleanup(true)
            return
        }

        if (!this.isConnected || statusCode === 515) {
            if (this.reconnectAttempts < MAX_WEB_RECONNECT_ATTEMPTS) {
                this.reconnectAttempts++
                console.log(chalk.yellow(
                    `🔄 Reconectando web ${this.phoneNumber} (${this.reconnectAttempts}/${MAX_WEB_RECONNECT_ATTEMPTS})...`
                ))

                this.cleanup(false)
                await delay(5000 * this.reconnectAttempts)

                await this.start()
            } else {
                console.log(chalk.red(`❌ Máximo reintentos web alcanzado: ${this.phoneNumber}`))
                this.callbacks?.onError?.('Máximo de reintentos alcanzado')
                this.cleanup(true)
            }
            return
        }

        const index = global.conns.indexOf(this.socket)
        if (index > -1) global.conns.splice(index, 1)
    }

    async setupMessageHandler(sock) {
        const uid = this.phoneNumber
        const handlerPath = path.join(process.cwd(), 'lib', 'message-handler.js')

        if (!fs.existsSync(handlerPath)) {
            console.error(chalk.red(`❌ message-handler.js no encontrado para ${uid}`))
            return
        }

        try {
            const handlerModule = await import(pathToFileURL(handlerPath).href)
            if (!handlerModule?.handleMessage) {
                console.error(chalk.red(`❌ handleMessage no exportado para ${uid}`))
                return
            }

            const commands = await this.loadCommands()
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
                        console.error(chalk.yellow(`⚠️ Error sub-bot web ${uid}:`), errMsg.substring(0, 100))
                    }
                }
            })

            console.log(chalk.green(`✅ Sub-bot web ${uid} listo con ${commands.size} comandos`))
        } catch (error) {
            console.error(chalk.red(`❌ Error setup handler web ${uid}:`), error.message)
        }
    }

    async loadCommands() {
        const commands = new Map()
        const loaderPath = path.join(process.cwd(), 'lib', 'loader.js')
        const commandsPath = path.join(process.cwd(), 'src', 'commands')

        if (!fs.existsSync(loaderPath) || !fs.existsSync(commandsPath)) {
            return commands
        }

        try {
            const { loadCommands } = await import(pathToFileURL(loaderPath).href)
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

    cleanup(fullCleanup = false) {
        if (this.connectionTimer) clearTimeout(this.connectionTimer)
        if (this.qrTimer) clearTimeout(this.qrTimer)

        try {
            if (this.socket) {
                this.socket.ev?.removeAllListeners()
                if (this.socket.ws?.readyState === 1) this.socket.ws.close()
            }
        } catch { }

        const uid = this.phoneNumber
        const index = global.conns.indexOf(this.socket)
        if (index > -1) global.conns.splice(index, 1)

        const botJid = this.socket?.user?.jid
        if (botJid) {
            global.subBots.delete(botJid)
            global.subBotsData.delete(botJid)
        }
        global.subBots.delete(uid)
        global.subBotsData.delete(uid)
        global.sentCodes.delete(uid)
        global.webPendingConnections.delete(uid)

        if (fullCleanup && !this.isConnected) {
            safeRmDir(path.join(SUBBOT_FOLDER, uid))
        }
    }

    getStatus() {
        return {
            phoneNumber: this.phoneNumber,
            type: this.type,
            status: this.status,
            qrData: this.qrData,
            codeData: this.codeData,
            isConnected: this.isConnected,
            createdAt: this.createdAt,
            elapsed: Date.now() - this.createdAt
        }
    }
}

export async function startWebConnection(phoneNumber, type, callbacks = {}) {
    const uid = cleanNum(phoneNumber)
    if (!uid) throw new Error('Número de teléfono inválido')

    const existing = global.webPendingConnections.get(uid)
    if (existing) {
        existing.cleanup(true)
        await delay(1000)
    }

    const controller = new WebConnectionController(uid, type, callbacks)
    await controller.start()
    return controller
}

export function getWebConnectionStatus(phoneNumber) {
    const uid = cleanNum(phoneNumber)
    const ctrl = global.webPendingConnections.get(uid)
    return ctrl ? ctrl.getStatus() : null
}

export function cancelWebConnection(phoneNumber) {
    const uid = cleanNum(phoneNumber)
    const ctrl = global.webPendingConnections.get(uid)
    if (ctrl) {
        ctrl.cleanup(true)
        return true
    }
    return false
}

export async function generateQRBuffer(phoneNumber) {
    const uid = cleanNum(phoneNumber)
    const ctrl = global.webPendingConnections.get(uid)

    if (!ctrl || !ctrl.qrData) return null

    try {
        const buffer = await QRCode.toBuffer(ctrl.qrData, {
            scale: 8,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark: '#00ff88', light: '#0a0a0a' }
        })
        return buffer
    } catch {
        return null
    }
}

export function getPairingCode(phoneNumber) {
    const uid = cleanNum(phoneNumber)
    const sent = global.sentCodes.get(uid)
    if (sent && sent.type === 'code') {
        return {
            formatted: sent.formatted,
            raw: sent.code,
            expiresAt: sent.timestamp + WEB_CODE_EXPIRY
        }
    }
    return null
}

export function linkWebSubBotToUser(phoneNumber, username) {
    const uid = cleanNum(phoneNumber)
    const config = getSubConfig(uid)
    config.owner = username
    config.linkedAt = new Date().toISOString()
    saveSubConfig(uid, config)

    const sock = global.subBots.get(uid) || global.subBots.get(`${uid}@s.whatsapp.net`)
    if (sock) {
        sock.ownerId = cleanNum(username)
        sock.subConfig = getSubConfig(uid)
    }

    return getSubConfig(uid)
}

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
            const cfg = getSubConfig(userId)
            if (cfg.source !== 'web' && cfg.owner) {
                console.log(chalk.gray(`  ↳ Saltando ${userId} (no es web)`))
                continue
            }

            await cleanSubBotCache(userId)

            console.log(chalk.blue(`  ↳ Iniciando web-bot: ${userId}`))

            const controller = new WebConnectionController(userId, 'qr', {
                onConnected: (info) => {
                    console.log(chalk.green(`  ✅ Web-bot auto-iniciado: ${info.name}`))
                },
                onError: (err) => {
                    console.log(chalk.red(`  ❌ Error auto-inicio ${userId}: ${err}`))
                }
            })

            await controller.start()
            await delay(2500)
        } catch (error) {
            console.error(chalk.red(`  ✖ Error restaurando web-bot ${userId}:`), error.message)
        }
    }
}
