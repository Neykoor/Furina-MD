import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const processedMessages = new NodeCache({ stdTTL: 30, checkperiod: 60 })

export function loadCommands(dir) {
    let archivos = []
    if (!fs.existsSync(dir)) return archivos

    try {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item)
            const stat = fs.statSync(fullPath)
            if (stat.isDirectory()) {
                archivos = archivos.concat(loadCommands(fullPath))
            } else if (item.endsWith('.js') && !item.startsWith('_')) {
                archivos.push(fullPath)
            }
        }
    } catch (e) {
        console.error(chalk.red('Error cargando comandos:'), e.message)
    }
    return archivos
}

export async function bindEvents(sock) {
    const commandsDir = path.join(process.cwd(), 'src', 'commands')
    const archivos = loadCommands(commandsDir)

    const commands = new Map()
    for (const filePath of archivos) {
        try {
            const fileUrl = pathToFileURL(filePath).href
            const module = await import(fileUrl)
            const plugin = module.default || module
            if (!plugin?.command) continue

            const cmds = [
                ...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]),
                ...(Array.isArray(plugin.aliases) ? plugin.aliases : [])
            ].map(c => c.toLowerCase())

            for (const cmd of cmds) {
                commands.set(cmd, { plugin, filePath })
            }
        } catch (e) {
            console.error(chalk.red(`❌ Error cargando ${path.basename(filePath)}:`), e.message)
        }
    }

    console.log(chalk.green(`✅ ${commands.size} comandos cargados`))

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m?.messages?.length) return
            const msg = m.messages[0]
            if (!msg?.message) return

            const botId = sock.user?.jid || sock.user?.id || 'unknown'
            const messageId = msg.key?.id
            if (!messageId) return

            const uniqueKey = `${botId}:${messageId}`
            if (processedMessages.has(uniqueKey)) return
            processedMessages.set(uniqueKey, true)

            if (msg.key?.remoteJid === 'status@broadcast') return
            if (msg.message?.protocolMessage) return
            if (msg.message?.senderKeyDistributionMessage) return

            const { handleMessage } = await import('./message-handler.js')
            await handleMessage(sock, msg, commands)

        } catch (error) {
            console.error(chalk.red('❌ Error en messages.upsert:'), error.message)
        }
    })

    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { onGroupUpdate } = await import('../src/commands/group/group-events.js')
            await onGroupUpdate(sock, update)
        } catch (e) {
            console.error(chalk.red('Error group-participants.update:'), e.message)
        }
    })
}
