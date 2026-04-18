import './setting.js'
import pkg from '@whiskeysockets/baileys'
import Pino from 'pino'
import qrcode from 'qrcode-terminal'
import readline from 'readline'
import { handler } from './lib/handler.js'
import { onGroupUpdate } from './plugins/eventos/group-events.js'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { pluginLid } from 'lidsync'
import { applyPremiumConfig, resetToDefaultConfig } from './lib/premium.js'
import { autoStartSubBots } from './plugins/socket/serbot.js'
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

let filtroActivo = false

const _stdoutWrite = process.stdout.write.bind(process.stdout)
const _stderrWrite = process.stderr.write.bind(process.stderr)

const iniciosFiltro = [
    'Closing session:',
    'Closing open session',
    'Decrypted message with closed session',
    'registrationId:',
    'currentRatchet:',
    'indexInfo:',
    'pendingPreKey:'
]

const filtrosLinea = [
    'prekey bundle', 'SessionEntry',
    'signedKeyId', 'preKeyId'
]

let bufOut = ''
let bufErr = ''
const estadoOut = { activo: false, depth: 0 }
const estadoErr = { activo: false, depth: 0 }

function procesarChunk(buf, writeFn, estado) {
    const lineas = buf.split('\n')
    const ultimo = lineas.pop()

    for (const linea of lineas) {
        if (iniciosFiltro.some(f => linea.includes(f))) {
            estado.activo = true
            estado.depth = 0
            continue
        }

        if (estado.activo) {
            const abre = (linea.match(/{/g) || []).length
            const cierra = (linea.match(/}/g) || []).length
            estado.depth += abre - cierra
            if (estado.depth <= 0 && cierra > 0) {
                estado.activo = false
                estado.depth = 0
            }
            continue
        }

        if (filtrosLinea.some(f => linea.includes(f))) continue

        writeFn(linea + '\n')
    }

    return ultimo
}

function activarFiltro() {
    filtroActivo = true

    process.stdout.write = (chunk, ...args) => {
        bufOut += chunk.toString()
        if (bufOut.includes('\n')) {
            bufOut = procesarChunk(bufOut, _stdoutWrite, estadoOut)
        }
        return true
    }

    process.stderr.write = (chunk, ...args) => {
        bufErr += chunk.toString()
        if (bufErr.includes('\n')) {
            bufErr = procesarChunk(bufErr, _stderrWrite, estadoErr)
        }
        return true
    }
}

async function verificarPlugins() {
    const pluginsDir = path.join(process.cwd(), 'plugins')
    const errores = []

    function buscarArchivos(dir) {
        let archivos = []
        if (!fs.existsSync(dir)) return archivos
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item)
            if (fs.statSync(fullPath).isDirectory()) {
                archivos = archivos.concat(buscarArchivos(fullPath))
            } else if (item.endsWith('.js')) {
                archivos.push(fullPath)
            }
        }
        return archivos
    }

    const archivos = buscarArchivos(pluginsDir)

    for (const filePath of archivos) {
        try {
            const fileUrl = pathToFileURL(filePath).href
            const mod = await import(fileUrl)
            if (!mod.default) continue
            const plugin = mod.default

            if (typeof plugin !== 'function') {
                errores.push({ archivo: path.relative(pluginsDir, filePath), error: 'export default no es función' })
                continue
            }
            if (!plugin.command) {
                errores.push({ archivo: path.relative(pluginsDir, filePath), error: 'Sin handler.command' })
            }
        } catch (err) {
            errores.push({ archivo: path.relative(pluginsDir, filePath), error: err.message })
        }
    }

    const dataDir = path.join(process.cwd(), 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'errores-inicio.json'), JSON.stringify(errores, null, 2))

    if (errores.length) {
        console.log(chalk.yellow(`\n⚠️  ${errores.length} plugin(s) con problema:`))
        for (const e of errores) console.log(chalk.red(`   ❌ ${e.archivo}: ${e.error}`))
        console.log('')
    } else {
        console.log(chalk.green(`✅ Todos los plugins cargaron correctamente\n`))
    }
}

function question(q) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        rl.question(q, (answer) => { rl.close(); resolve(answer) })
    })
}

function limpiarNumero(numero) {
    return numero.replace(/[^0-9]/g, '')
}

let asked = false

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    try {
        store.readFromFile('./baileys_store.json')
    } catch (e) {}

    let usarQR = true
    let numeroGuardado = null

    const sesionExiste = state.creds.registered || state.creds.me?.id

    if (!sesionExiste && !asked) {
        asked = true
        console.log(chalk.cyan(`\n╔════════════════════════════════════════╗`))
        console.log(chalk.cyan(`║     ${global.namebot} v${global.vs}      ║`))
        console.log(chalk.cyan(`╚════════════════════════════════════════╝\n`))
        console.log(chalk.white('1. 📱 Código de emparejamiento'))
        console.log(chalk.white('2. 📷 Código QR\n'))

        const opcion = await question(chalk.yellow('Opción (1 o 2): '))
        if (opcion.trim() === '1') {
            usarQR = false
            const raw = await question(chalk.yellow('\n📞 Número con código de país (ej: 521XXXXXXXXXX):\n> '))
            numeroGuardado = limpiarNumero(raw)
            console.log(chalk.green(`\n✅ Número registrado: ${numeroGuardado}`))
            console.log(chalk.blue('⏳ Conectando, espera el código...\n'))
        }
    } else if (sesionExiste) {
        console.log(chalk.blue(`\n⏳ Reconectando ${global.namebot}...\n`))
    }

    activarFiltro()
    await verificarPlugins()

    const logger = Pino({ level: 'silent' })

    let sock = makeWASocket({
        logger,
        auth: state,
        browser: [global.namebot, 'Chrome', global.vs],
        version,
        printQRInTerminal: false
    })

    store.bind(sock.ev)

    sock = pluginLid(sock, { store })

    if (!sesionExiste && !usarQR && numeroGuardado) {
        await new Promise((resolve) => {
            const listener = (update) => {
                if (update.connection === 'connecting' || update.qr) {
                    sock.ev.off('connection.update', listener)
                    resolve()
                }
            }
            sock.ev.on('connection.update', listener)
            setTimeout(resolve, 5000)
        })

        try {
            const code = await sock.requestPairingCode(numeroGuardado)
            console.log(chalk.cyan(`\n╔════════════════════════════════════════╗`))
            console.log(chalk.cyan(`║   🔑 CÓDIGO: ${code}         ║`))
            console.log(chalk.cyan(`╚════════════════════════════════════════╝\n`))
            console.log(chalk.white('📱 Ingresa en WhatsApp > Dispositivos vinculados\n'))
        } catch (err) {
            console.log(chalk.red('❌ Error al obtener código:', err.message))
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update

        if (qr && usarQR && !sesionExiste) {
            console.log(chalk.yellow('\n📷 Escanea el QR:'))
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'open') {
            resetToDefaultConfig()
            
            const botNumber = sock.user?.id || ''
            if (botNumber) {
                const premiumApplied = applyPremiumConfig(botNumber)
                if (premiumApplied) {
                    console.log(chalk.green(`\n✅ ${global.namebot} conectado (Modo Premium)\n`))
                } else {
                    console.log(chalk.green(`\n✅ ${global.namebot} conectado (Modo Gratuito)\n`))
                }
            } else {
                console.log(chalk.green(`\n✅ ${global.namebot} conectado\n`))
            }
            
            try {
                const botId = sock.user?.id?.replace(/:.*@/, '@') || ''
                if (botId) {
                    await sock.sendMessage(botId, {
                        text: `🤖 *${global.namebot}* en línea\n📅 ${new Date().toLocaleString()}`
                    })
                }
            } catch {}

            setTimeout(() => {
                autoStartSubBots().catch(err => {
                    console.error(chalk.red('Error iniciando sub-bots:'), err.message)
                })
            }, 5000)
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log(chalk.yellow('🔄 Reconectando...'))
                if (sock.lid && typeof sock.lid.destroy === 'function') {
                    sock.lid.destroy()
                }
                start()
            } else {
                console.log(chalk.red('❌ Sesión cerrada'))
                process.exit(0)
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('messages.upsert', async (m) => {
        await handler(sock, m)
    })

    sock.ev.on('group-participants.update', async (update) => {
        await onGroupUpdate(sock, update)
    })
}

start().catch(err => {
    console.error(chalk.red('❌ Error fatal:'), err)
    process.exit(1)
})