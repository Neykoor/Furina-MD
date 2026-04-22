import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

// ... (tus funciones de registrarError y getTipoMensaje se mantienen igual)

export default async function handler(sock, m) {
    try {
        if (!m || !m.message) return
        if (m.key && m.key.remoteJid === 'status@broadcast') return

        const from = m.key.remoteJid
        const type = getTipoMensaje(m)
        if (!type) return

        // --- Traducción de Identidad (LidSync) ---
        // Primero sacamos el ID que nos da WhatsApp (puede ser un número o un LID)
        let senderJid = m.key.participant || m.key.remoteJid
        
        // Aquí es donde ocurre la magia: si el ID termina en @lid, le pedimos a la 
        // librería que nos diga el número real para no romper la base de datos.
        if (sock.lid && senderJid.endsWith('@lid')) {
            const resuelto = await sock.lid.resolve(senderJid)
            if (resuelto) {
                senderJid = resuelto // ¡Listo! Ahora senderJid es el número real
            }
        }
        // -----------------------------------------

        const isGroup = from.endsWith('@g.us')
        
        // Ahora todas estas validaciones de Owner o de base de datos 
        // funcionan perfecto porque ya tenemos el JID real (@s.whatsapp.net)
        const isOwner = [...global.owner || []].some(u => u[0] + '@s.whatsapp.net' === senderJid)
        
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : ''

        const prefix = /^[./!#]/.test(body) ? body.match(/^[./!#]/)[0] : ''
        const isCommand = body.startsWith(prefix) && prefix !== ''
        const command = isCommand ? body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : ''
        const args = body.trim().split(/\s+/).slice(1)
        const usedPrefix = prefix

        if (!isCommand) return

        // Buscamos el plugin que coincida con el comando
        const { getPlugins } = await import('./loader.js')
        const plugins = getPlugins()
        const plugin = Object.values(plugins).find(p => p.command && p.command.includes(command))

        if (!plugin) return

        // Sacamos la info del grupo solo si estamos en uno (usamos cache para ir más rápido)
        let groupMetadata = {}
        let participants = []
        let isAdmin = false
        let isBotAdmin = false

        if (isGroup) {
            groupMetadata = groupCache.get(from) || await sock.groupMetadata(from)
            groupCache.set(from, groupMetadata)
            participants = groupMetadata.participants || []
            isAdmin = participants.find(p => p.id === senderJid)?.admin !== null
            isBotAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin !== null
        }

        const fromMe = m.key.fromMe
        const relativo = path.relative(process.cwd(), plugin.filePath)

        console.log(
            chalk.bgBlue.white(`\n⚡ COMANDO: ${usedPrefix}${command}`),
            chalk.gray(`[${relativo}]`),
            chalk.cyan(`(Resuelto: ${senderJid})`) // Log para que veas que está resolviendo
        )

        // Validaciones de seguridad del plugin
        if (plugin.owner && !isOwner) return 
        if (plugin.group && !isGroup) return
        if (plugin.admin && !isAdmin) return

        // Ejecutamos el plugin pasándole el senderJid ya "limpio"
        try {
            await plugin.default(m, {
                conn: sock,
                args,
                usedPrefix,
                sender: senderJid, // Importante: pasamos el JID resuelto
                isOwner,
                command,
                isGroup,
                isAdmin,
                isBotAdmin,
                groupMetadata,
                participants,
                fromMe,
                text: args.join(' ')
            })
        } catch (err) {
            console.error(chalk.red(`\n❌ ERROR EN [${relativo}]:`), err.message)
            registrarError(relativo, command, senderJid, err)
        }

    } catch (error) {
        console.error(chalk.red('❌ ERROR CRÍTICO EN HANDLER:'), error)
    }
}
