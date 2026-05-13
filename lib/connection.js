import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'

import pino from 'pino'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import qrcode from 'qrcode-terminal'
import { pluginLid } from 'lidsync'
import { Boom } from '@hapi/boom'
import readline from 'readline'

import { adminManager } from './admins.js'
import { welcomeHandler } from './welcome.js'

const SESSION_PATH = path.resolve(process.cwd(), 'session_principal')
const CREDS_PATH = path.join(SESSION_PATH, 'creds.json')
const FLAG_PATH = path.join(SESSION_PATH, 'setup_done')

const silentLogger = pino({ level: 'silent' })

let cachedVersion = null

async function getBaileysVersion() {
    if (cachedVersion) return cachedVersion
    try {
        const { version } = await fetchLatestBaileysVersion()
        cachedVersion = version
    } catch {
        cachedVersion = [2, 3000, 1015901307]
    }
    return cachedVersion
}

const isAlreadyConfigured = () => {
    if (fs.existsSync(CREDS_PATH)) {
        try {
            const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'))
            if (creds.registered) return true
            fs.rmSync(SESSION_PATH, { recursive: true, force: true })
        } catch {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true })
            return false
        }
        return false
    }
    return fs.existsSync(FLAG_PATH)
}

const markAsDone = () => {
    if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true })
    }
    fs.writeFileSync(FLAG_PATH, 'true')
}

const normalizePhone = (input) => {
    let s = String(input || '').replace(/\D/g, '')
    if (!s) return ''
    s = s.replace(/^0+/, '')
    return s
}

async function promptSetup() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const question = (text) => new Promise((resolve) => rl.question(text, resolve))

    console.clear()
    console.log(chalk.magentaBright('\n❀ SISTEMA CENTRAL: CONFIGURACION 🌸'))
    console.log(chalk.blueBright('  1. Con codigo QR'))
    console.log(chalk.cyan('  2. Con codigo de texto (Pairing Code)\n'))

    const option = await question(chalk.yellow('Selecciona una opcion --> '))
    let phone = ''

    if (option === '2') {
        console.log(chalk.white('\nIntroduce tu numero (Ej: 5216631079388)'))
        const input = await question(chalk.magentaBright('---> '))
        phone = normalizePhone(input)
    }

    rl.close()
    return { option, phone }
}

export async function connectToWhatsApp({ store, onOpen, onSync, onMessage, gacha }) {
    const argsQR = process.argv.includes('--qr')
    const argsCodeIdx = process.argv.indexOf('--code')
    const argsPhone = argsCodeIdx !== -1 ? process.argv[argsCodeIdx + 1] : null

    let selectedOption = argsQR ? '1' : argsPhone ? '2' : null
    let phoneNumber = argsPhone ? normalizePhone(argsPhone) : ''

    if (!selectedOption && !isAlreadyConfigured()) {
        const setup = await promptSetup()
        selectedOption = setup.option
        phoneNumber = setup.phone
        markAsDone()
    }

    const version = await getBaileysVersion()

    let doneFlagged = false
    let everConnected = false

    const start = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)

        let sock = makeWASocket({
            logger: silentLogger,
            printQRInTerminal: false,
            browser: ['Mac OS', 'Chrome', '121.0.6167.159'],
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
            },
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            keepAliveIntervalMs: 60_000,
            maxIdleTimeMs: 120_000,
        })

        sock = pluginLid(sock, { store })

        if (store) {
            store.bind(sock.ev, sock)
        }

        sock.getProfilePicture = async (jid) => {
            try {
                if (!jid) throw new Error('jid vacio')
                if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`
                return await sock.profilePictureUrl(jid, 'image')
            } catch {
                return 'https://i.imgur.com/6Rl8bJk.jpeg'
            }
        }

        sock.ev.on('creds.update', async () => {
            if (!doneFlagged) {
                markAsDone()
                doneFlagged = true
            }
            await saveCreds()
        })

        let codeRequested = false

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, receivedPendingNotifications } = update

            if (receivedPendingNotifications) {
                sock.ev.flush?.()
                if (everConnected) {
                    console.log(chalk.gray('[Principal] Eventos pendientes procesados.'))
                }
            }

            if (qr && !state.creds.registered) {
                if (selectedOption === '1') {
                    console.log(chalk.green.bold('\n[ ✿ ] Escanea este codigo QR:'))
                    qrcode.generate(qr, { small: true })
                }

                if (selectedOption === '2' && !codeRequested) {
                    codeRequested = true
                    setTimeout(async () => {
                        try {
                            let code = await sock.requestPairingCode(phoneNumber)
                            code = code.match(/.{1,4}/g)?.join('-') || code
                            console.log(
                                chalk.bold.white(chalk.bgMagenta('\n TU CODIGO DE VINCULACION: ')),
                                chalk.bold.white(` ${code} \n`),
                            )
                        } catch {
                            codeRequested = false
                        }
                    }, 3000)
                }
            }

            if (connection === 'open') {
                adminManager.invalidateAll()
                const userId = sock.user.id.split(':')[0]
                const isReconnect = everConnected
                everConnected = true

                if (isReconnect) {
                    console.log(chalk.yellow(`\n🔄 [Principal] +${userId} Reconectado`))
                } else {
                    console.log(chalk.green(`\n✅ [Principal] +${userId} Conectado con exito`))
                }

                await onSync(sock)
                if (!isReconnect) {
                    await onOpen(sock)
                }
            }

            if (connection === 'close') {
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode

                if (statusCode !== DisconnectReason.loggedOut) {
                    const delay = everConnected ? 5000 : 3000
                    if (everConnected) {
                        console.log(chalk.gray('[Principal] Conexion cerrada. Reconectando...'))
                    }
                    if (store) store.unbind()
                    sock.ev.removeAllListeners()
                    setTimeout(start, delay)
                } else {
                    sock.ev.removeAllListeners()
                    if (fs.existsSync(SESSION_PATH)) {
                        fs.rmSync(SESSION_PATH, { recursive: true, force: true })
                    }
                    if (store) await store.close().catch(() => {})
                    process.exit(0)
                }
            }
        })

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify') return

            const firstMsg = m.messages?.[0]
            if (firstMsg) {
                const sender = firstMsg.key.participant || firstMsg.key.remoteJid
                if (gacha?.updatePresence && sender) {
                    gacha.updatePresence(sock, sender).catch(() => {})
                }
            }

            await onMessage(sock, m).catch(() => {})
        })

        sock.ev.on('group-participants.update', async (update) => {
            await welcomeHandler(sock, update).catch(e =>
                console.error(chalk.yellow('[Welcome] Error:'), e.message)
            )
        })

        return sock
    }

    return start()
}
