import pkg from '@whiskeysockets/baileys'
import Pino from 'pino'
import readline from 'readline'
import chalk from 'chalk'
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
    level: 'silent', // Cambiado a silent para evitar spam innecesario
    redact: SILENT_PATTERNS,
    serializers: {
        err: Pino.stdSerializers.err,
        req: Pino.stdSerializers.req,
        res: Pino.stdSerializers.res
    }
}, Pino.destination({ sync: false }))

export async function start() {
    if (isConnecting) return
    isConnecting = true

    const { state, saveCreds } = await useMultiFileAuthState('session/Principal')
    const { version } = await fetchLatestBaileysVersion()

    // 1. Inicializamos el store primero
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
        browser: ['Ubuntu', 'Edge', '110.0.1587.56'],
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
    })

    // 2. Inyectamos LidSync ANTES de bindear los eventos
    // Le pasamos el store para que el auto-aprendizaje funcione con tus contactos guardados
    sock = pluginLid(sock, { store })

    // 3. Vinculamos el store al socket
    // Nota:  bindStoreToSocket ya obtiene el store internamente
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

            if (statusCode === 515 || statusCode === 428) {
                const delay = statusCode === 428 ? 10000 : 5000
                console.log(chalk.yellow(`🔄 Error ${statusCode}. Reconectando en ${delay/1000}s...`))
                await new Promise(resolve => setTimeout(resolve, delay))
                isConnecting = false
                start()
                return
            }

            if (statusCode === 401) {
                console.log(chalk.red('❌ Credenciales inválidas. Elimina session/ y reinicia.'))
                process.exit(0)
            }

            isConnecting = false
            start()
        } else if (connection === 'open') {
            console.log(chalk.green('✅ Conexión establecida con éxito.'))
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
    console.error(chalk.red('⚠️ Excepción no capturada:'), err)
})
