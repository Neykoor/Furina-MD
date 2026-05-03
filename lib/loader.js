import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'
import NodeCache from 'node-cache'

// Cache para evitar procesar el mismo mensaje dos veces
const processedMessages = new NodeCache({ stdTTL: 30, checkperiod: 60 })

// ══════════════════════════════════════════════════════════════════
// Carga recursiva de comandos.
// IGNORA la carpeta "funciones/" porque contiene detectores internos,
// no comandos ejecutables por el usuario.
// ══════════════════════════════════════════════════════════════════
export function loadCommands(dir) {
    let archivos = []
    if (!fs.existsSync(dir)) return archivos

    try {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory()) {
                // Saltar la carpeta "funciones" — son detectores internos, no comandos
                if (item === 'funciones') continue
                archivos = archivos.concat(loadCommands(fullPath))
            } else if (item.endsWith('.js') && !item.startsWith('_')) {
                archivos.push(fullPath)
            }
        }
    } catch (e) {
        console.error(chalk.red('❌ Error cargando comandos:'), e.message)
    }

    return archivos
}

// ══════════════════════════════════════════════════════════════════
// Registra comandos y enlaza eventos del socket
// ══════════════════════════════════════════════════════════════════
export async function bindEvents(sock) {
    const commandsDir = path.join(process.cwd(), 'src', 'commands')
    const archivos = loadCommands(commandsDir)

    const commands = new Map()

    for (const filePath of archivos) {
        try {
            const fileUrl = pathToFileURL(filePath).href
            const module = await import(fileUrl)
            const plugin = module.default || module

            // Solo registrar si tiene la propiedad "command" definida
            if (!plugin?.command) continue

            const cmds = [
                ...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]),
                ...(Array.isArray(plugin.aliases)  ? plugin.aliases  : [])
            ]

            for (const cmd of cmds) {
                if (typeof cmd === 'string' && cmd.trim()) {
                    commands.set(cmd.toLowerCase(), { plugin, filePath })
                }
            }
        } catch (e) {
            console.error(chalk.red(`❌ Error cargando ${path.basename(filePath)}:`), e.message)
        }
    }

    console.log(chalk.green(`✅ ${commands.size} comandos cargados correctamente`))

    // ── Mensajes entrantes ─────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
            if (!messages?.length) return
            const msg = messages[0]
            if (!msg?.message) return

            // Evitar procesar el mismo mensaje dos veces (reconexiones)
            const botId = sock.user?.jid || sock.user?.id || 'unknown'
            const msgId = msg.key?.id
            if (!msgId) return

            const uniqueKey = `${botId}:${msgId}`
            if (processedMessages.has(uniqueKey)) return
            processedMessages.set(uniqueKey, true)

            // Ignorar distribución de claves (ruido interno de WA)
            if (msg.message?.senderKeyDistributionMessage) return

            // ── Anti-Delete: protocolMessage tipo 0 = eliminación ──
            if (msg.message?.protocolMessage) {
                if (msg.message.protocolMessage.type === 0) {
                    try {
                        const { antiDeleteDetectorMaster } = await import('../src/commands/funciones/anti-master.js')
                        await antiDeleteDetectorMaster(sock, msg)
                    } catch { }
                }
                return // No procesar como comando normal
            }

            // Ignorar canal de estados
            if (msg.key?.remoteJid === 'status@broadcast') return

            // Procesar como posible comando o disparo de antis
            const { handleMessage } = await import('./message-handler.js')
            await handleMessage(sock, msg, commands)

        } catch (error) {
            console.error(chalk.red('❌ Error en messages.upsert:'), error.message)
        }
    })

    // ── Anti-Call: rechazar llamadas entrantes ─────────────────────
    sock.ev.on('call', async (callData) => {
        try {
            const { antiCallDetectorMaster } = await import('../src/commands/funciones/anti-master.js')
            await antiCallDetectorMaster(sock, callData)
        } catch { }
    })

    // ── Eventos de participantes del grupo ─────────────────────────
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { onGroupUpdate } = await import('../src/commands/group/group-events.js')
            await onGroupUpdate(sock, update)
        } catch { }
    })
}
