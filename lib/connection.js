import pkg from '@whiskeysockets/baileys'
import Pino from 'pino'
import readline from 'readline'
import chalk from 'chalk'
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
    'closed:', 'used:', 'created:'
]

const originalError = console.error
console.error = function (...args) {
    const msg = args.join(' ')
    if (SILENT_PATTERNS.some(p => msg.includes(p))) return
    originalError.apply(console, args)
}

export async function start() {
    if (isConnecting) return
    isConnecting = true

    const store = createStore()
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    let useQR = true
    let numeroLimpio = ''

    if (!state.creds.registered) {
        console.clear()
        console.log(chalk.cyan.bold('═══════════════════════════════════════'))
        console.log(chalk.cyan.bold(`       🤖 ${global.namebot || 'ASTA BOT'} • INICIO`))
        console.log(chalk.cyan.bold('═══════════════════════════════════════\n'))

        const metodo = await question(chalk.yellow("Método de vinculación:\n") +
            chalk.white("1. ") + chalk.green("QR\n") +
            chalk.white("2. ") + chalk.green("Código 8 dígitos\n") +
            chalk.yellow("Elige (1/2): "))

        if (metodo.trim() === '2') {
            useQR = false
            const numero = await question(chalk.yellow("\nNúmero (con código país, ej. 521...): "))
            numeroLimpio = numero.replace(/[^0-9]/g, "")
        }
    }

    // CORRECCIÓN: Usar makeCacheableSignalKeyStore para mejorar la estabilidad
    // y evitar errores de sesión durante la vinculación
    const authState = state.creds.registered
        ? {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'silent' }))
        }
        : state

    sock = makeWASocket({
        version,
        logger: Pino({ level: 'silent' }),
        // CORRECCIÓN: printQRInTerminal solo si elegimos QR Y no estamos registrados
        printQRInTerminal: useQR && !state.creds.registered,
        auth: authState,
        // CORRECCIÓN: browser debe ser consistente con el modo de vinculación
        browser: useQR
            ? ["Asta-MD", "Chrome", "120.0.0.0"]
            : ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: getMessageFromStore,
        // CORRECCIÓN: parámetros de timeout y estabilidad de conexión
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 3,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
    })

    sock.isMainBot = true
    sock.isSubBot = false
    sock.ownerId = null

    // Bandera para pedir el código solo una vez al recibir el primer QR
    let pairingCodeRequested = false

    bindStoreToSocket(sock)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && useQR) {
            console.log(chalk.cyan('📱 Escanea el QR con WhatsApp...'))
        }

        // Solicitar código de emparejamiento la primera vez que llega el QR
        if (qr && !useQR && !state.creds.registered && !pairingCodeRequested) {
            pairingCodeRequested = true
            try {
                const codigo = await sock.requestPairingCode(numeroLimpio)
                const codigoFormateado = codigo?.match(/.{1,4}/g)?.join("-") || codigo
                console.log(chalk.green.bold('\n═══════════════════════════════════════'))
                console.log(chalk.green.bold('🔑 CÓDIGO DE EMPAREJAMIENTO:'))
                console.log(chalk.white.bold(`   ${codigoFormateado}`))
                console.log(chalk.green.bold('═══════════════════════════════════════'))
                console.log(chalk.yellow('⏳ El código expira en ~60 segundos\n'))
            } catch (error) {
                console.error(chalk.red('❌ Error al solicitar código:'), error.message)
                isConnecting = false
                start()
            }
        }

        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Conectando...'))
        }

        if (connection === 'open') {
            isConnecting = false
            // CORRECCIÓN: cerrar el readline al conectar exitosamente
            // para liberar el proceso y no bloquear stdin
            try { rl.close() } catch (_) {}

            console.log(chalk.green.bold('\n═══════════════════════════════════════'))
            console.log(chalk.green.bold('✅ CONEXIÓN ESTABLECIDA'))
            console.log(chalk.green.bold('═══════════════════════════════════════'))
            console.log(chalk.blue('🤖 MODO: BOT PRINCIPAL'))

            try {
                // CORRECCIÓN: normalizar correctamente el JID del bot
                const rawId = sock.user?.id || sock.user?.jid || ''
                const botId = rawId.replace(/:.*@/, '@') || ''
                const botName = sock.user?.name || global.namebot || 'Asta Bot'
                const botNumber = rawId.split(':')[0] || rawId.split('@')[0] || 'Desconocido'

                console.log(chalk.green(`👤 Bot: ${botName}`))
                console.log(chalk.green(`📱 Número: ${botNumber}`))

                if (botId) {
                    await sock.sendMessage(botId, {
                        text: `🤖 *${botName}* en línea\n📅 ${new Date().toLocaleString()}\n🤖 Modo: Principal`
                    })
                }
            } catch (e) { }

            setTimeout(async () => {
                try {
                    const { autoStartSubBots } = await import('../src/commands/serbot/serbot.js')
                    await autoStartSubBots()
                } catch (e) { }
            }, 5000)
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ SESIÓN CERRADA (LoggedOut)'))
                console.log(chalk.yellow('Elimina la carpeta session/ y reinicia'))
                process.exit(0)
            }

            if (statusCode === 515) {
                console.log(chalk.yellow(`🔄 Error 515 (stream restart). Reconectando en 5s...`))
                await new Promise(resolve => setTimeout(resolve, 5000))
                isConnecting = false
                start()
                return
            }

            // CORRECCIÓN: No reconectar si el error es de credenciales inválidas (401)
            if (statusCode === 401) {
                console.log(chalk.red('❌ Credenciales inválidas. Elimina session/ y reinicia.'))
                process.exit(0)
            }

            const delay = statusCode === 428 ? 10000 : 3000
            console.log(chalk.yellow(`🔄 Reconectando en ${delay / 1000}s... (código: ${statusCode || '?'})`))
            await new Promise(resolve => setTimeout(resolve, delay))
            isConnecting = false
            start()
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
    console.error(chalk.red('❌ Error no capturado:'), err.message)
})

process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('❌ Promesa rechazada:'), reason)
})
