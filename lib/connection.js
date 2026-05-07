import pkg from '@whiskeysockets/baileys'
import Pino from 'pino'
import readline from 'readline'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { pluginLid } from 'lidsync' 
import { createStore, bindStoreToSocket, getMessageFromStore } from './store.js'

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = pkg

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let sock = null
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

const SILENT_PATTERNS = [
    'Closing session:', 'Closing open session', 'Closing stale open session',
    'SessionEntry', '_chains:', 'registrationId:', 'currentRatchet:',
    'ephemeralKeyPair:', 'lastRemoteEphemeralKey:', 'previousCounter:',
    'rootKey:', 'indexInfo:', 'baseKey:', 'baseKeyType:', 'pendingPreKey:',
    'signedKeyId:', 'preKeyId:', 'remoteIdentityKey:', 'pubKey:', 'privKey:',
    'Invalid media type', 'Error bye usuario:', 'Failed to decrypt message',
    'Decrypted message with closed session', 'Bad MAC Error', 'Session error:',
    'Got receipt', 'Got sender key', 'Got message with closed session',
    'Unhandled receipt', 'Appending 0 messages', 'recv ', 'Queueing 1',
    'Got unknown', 'Buffer', '<Buffer', 'closing stale open session',
    'for new outgoing prekey bundle', 'chainKey', 'chainType', 'messageKeys',
]

const logger = Pino({
    level: 'silent',
    redact: SILENT_PATTERNS,
    serializers: {
        err: Pino.stdSerializers.err,
        req: Pino.stdSerializers.req,
        res: Pino.stdSerializers.res
    }
}, Pino.destination({ sync: false }))

async function cleanCorruptSessions(sessionPath) {
    try {
        if (!fs.existsSync(sessionPath)) return
        const files = fs.readdirSync(sessionPath)
        let cleaned = 0
        for (const file of files) {
            const filePath = path.join(sessionPath, file)
            if (file.includes('session') || file.includes('pre-key') || file.includes('sender-key')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8')
                    if (content.includes('"closed":-1') || content.includes('"closed": -1')) {
                        fs.unlinkSync(filePath)
                        cleaned++
                    }
                } catch {
                    fs.unlinkSync(filePath)
                    cleaned++
                }
            }
        }
        if (cleaned > 0) console.log(chalk.yellow(`🧹 ${cleaned} sesiones corruptas limpiadas`))
    } catch (err) {
        console.error(chalk.red('Error limpiando sesiones:'), err.message)
    }
}

export async function start() {
    if (isConnecting) return
    isConnecting = true

    const sessionPath = 'session/Principal'
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version } = await fetchLatestBaileysVersion()

    const store = createStore() 

    sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger: logger,
        getMessage: getMessageFromStore,
        browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 10000,
        shouldSyncHistoryMessage: () => false,
    })

    sock = pluginLid(sock, { store })

    bindStoreToSocket(sock)

    const usePairingCode = true
    if (usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('Introduce tu número de teléfono (ej: 521...): '))
        const code = await sock.requestPairingCode(phoneNumber.replace(/\s+/g, ''))
        console.log(chalk.white('Tu código de vinculación es: ') + chalk.bold.green(code))
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut

            console.log(chalk.red(`📡 Conexión cerrada. Razón: ${statusCode || 'unknown'}`))

            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ Sesión cerrada permanentemente.'))
                process.exit(0)
            }

            if (statusCode === 401) {
                console.log(chalk.red('❌ Credenciales inválidas. Elimina session/ y reinicia.'))
                process.exit(0)
            }

            if (statusCode === 515 || statusCode === 428) {
                reconnectAttempts++
                const delay = statusCode === 428 ? 30000 : 10000
                
                console.log(chalk.yellow(`🔄 Error ${statusCode}. Intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}. Reconectando en ${delay/1000}s...`))
                
                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.log(chalk.red('❌ Demasiados intentos. Borrando sesión...'))
                    try {
                        fs.rmSync(sessionPath, { recursive: true, force: true })
                    } catch(e) {}
                    reconnectAttempts = 0
                } else {
                    await cleanCorruptSessions(sessionPath)
                }
                
                await new Promise(resolve => setTimeout(resolve, delay))
                isConnecting = false
                start()
                return
            }

            console.log(chalk.yellow(`🔄 Reconectando...`))
            await new Promise(resolve => setTimeout(resolve, 5000))
            isConnecting = false
            start()
            
        } else if (connection === 'open') {
            console.log(chalk.green('✅ Conexión establecida con éxito.'))
            reconnectAttempts = 0
            isConnecting = false
        }
    })

    sock.ev.on('creds.update', saveCreds)

    const { bindEvents } = await import('./loader.js')
    await bindEvents(sock)

    return sock
}

export function getSocket() {
    return sock
}

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Bot detenido'))
    process.exit(0)
})

process.on('uncaughtException', (err) => {
    console.error(chalk.red('⚠️ Excepción no capturada:'), err.message)
})
