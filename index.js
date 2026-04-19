import './setting.js'
import pkg from '@whiskeysockets/baileys'
import Pino from 'pino'
import readline from 'readline'
import { handler } from './lib/handler.js'
import { onGroupUpdate } from './plugins/eventos/group-events.js'
import fs from 'fs'
import path from 'path'
import { applyPremiumConfig, resetToDefaultConfig } from './lib/premium.js'
import chalk from 'chalk'

const { 
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    DisconnectReason
} = pkg

const store = makeInMemoryStore({ logger: Pino({ level: 'silent' }) })

setInterval(() => {
    try {
        store.writeToFile('./baileys_store.json')
    } catch (e) {}
}, 10_000)

// Filtro de debug silenciado
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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let sock = null
let isConnecting = false

async function start() {
    if (isConnecting) return
    isConnecting = true
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
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

    sock = makeWASocket({
        version,
        logger: Pino({ level: 'silent' }),
        printQRInTerminal: useQR,
        auth: state,
        browser: useQR ? ["Eris-MD", "Chrome", "1.0.0"] : ["Ubuntu", "Chrome", "22.04.4"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg?.message || undefined
            }
            return { conversation: 'Mensaje no disponible' }
        }
    })

    if (!useQR && !state.creds.registered) {
        setTimeout(async () => {
            try {
                const codigo = await sock.requestPairingCode(numeroLimpio)
                const codigoFormateado = codigo?.match(/.{1,4}/g)?.join("-") || codigo
                console.log(chalk.green.bold('\n═══════════════════════════════════════'))
                console.log(chalk.green.bold(`🔑 CÓDIGO: ${codigoFormateado}`))
                console.log(chalk.green.bold('═══════════════════════════════════════\n'))
            } catch (error) {
                console.error(chalk.red("❌ Error al solicitar código:"), error.message)
            }
        }, 3000)
    }

    store.bind(sock.ev)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr && useQR) {
            console.log(chalk.cyan('📱 Escanea el QR...'))
        }

        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Conectando...'))
        }
        
        if (connection === 'open') {
            isConnecting = false
            console.log(chalk.green.bold('\n═══════════════════════════════════════'))
            console.log(chalk.green.bold('✅ CONEXIÓN ESTABLECIDA'))
            console.log(chalk.green.bold('═══════════════════════════════════════'))
            
            if (global.isPremium) {
                applyPremiumConfig(sock)
            } else {
                resetToDefaultConfig()
            }
            
            try {
                const botId = sock.user?.id?.replace(/:.*@/, '@') || ''
                const botName = sock.user?.name || global.namebot || 'Asta Bot'
                if (botId) {
                    await sock.sendMessage(botId, {
                        text: `🤖 *${botName}* en línea\n📅 ${new Date().toLocaleString()}`
                    })
                }
                console.log(chalk.green(`👤 Bot: ${botName}`))
                console.log(chalk.green(`📱 Número: ${sock.user?.jid?.split('@')[0] || 'Desconocido'}`))
            } catch (e) {}

            // Auto-iniciar sub-bots
            setTimeout(async () => {
                try {
                    const { autoStartSubBots } = await import('./plugins/socket/serbot.js')
                    await autoStartSubBots()
                } catch (e) {}
            }, 5000)
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('❌ SESIÓN CERRADA'))
                console.log(chalk.yellow('Elimina auth_info_baileys y reinicia'))
                process.exit(0)
            }
            
            // Manejo optimizado del error 515
            if (statusCode === 515) {
                console.log(chalk.yellow(`🔄 Error 515. Reconectando en 5s...`))
                await new Promise(resolve => setTimeout(resolve, 5000))
                isConnecting = false
                start()
                return
            }
            
            console.log(chalk.yellow(`🔄 Reconectando... (${statusCode || '?'})`))
            await new Promise(resolve => setTimeout(resolve, 3000))
            isConnecting = false
            start()
        }
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('messages.upsert', async (m) => {
        await handler(sock, m)
    })

    sock.ev.on('group-participants.update', async (update) => {
        await onGroupUpdate(sock, update)
    })

    return sock
}

start().catch(err => {
    console.error(chalk.red('❌ Error fatal:'), err)
    process.exit(1)
})

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Bot detenido'))
    process.exit(0)
})

process.on('uncaughtException', (err) => {
    console.error(chalk.red('❌ Error:'), err.message)
})

process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('❌ Promesa rechazada:'), reason)
})