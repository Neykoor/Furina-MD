import { isPremium, setBotConfig, getBotConfig, normalize } from '../../lib/premium.js'

// Función para extraer ID de canal desde URL o input
async function extractChannelId(conn, input) {
    if (!input) return null
    
    // Si ya es un JID de newsletter
    if (input.includes('@newsletter')) {
        return input.trim()
    }
    
    // Extraer código de invitación de URL de WhatsApp
    const inviteMatch = input.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/channel\/([0-9A-Za-z]{22,24})/i)
    if (inviteMatch && inviteMatch[1]) {
        try {
            // Obtener metadata del canal para sacar el JID real
            const metadata = await conn.newsletterMetadata("invite", inviteMatch[1])
            if (metadata && metadata.id) {
                return metadata.id
            }
        } catch (e) {
            console.error('Error obteniendo metadata del canal:', e.message)
            return null
        }
    }
    
    // Si es solo números (ID numérica), agregar @newsletter
    if (/^\d+$/.test(input)) {
        return `${input}@newsletter`
    }
    
    return null
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
    const premium = isPremium(m.sender)
    
    // Solo en privado para usuarios premium
    if (m.isGroup) {
        return conn.sendMessage(m.chat, { 
            text: '👤 Este comando solo funciona en *chat privado*.' 
        }, { quoted: m })
    }
    
    if (!premium && !m.isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '👑 Este comando es solo para usuarios *premium*.' 
        }, { quoted: m })
    }

    if (!args[0]) {
        const cfg = getBotConfig(m.sender)
        let txt = '⚙️ *Configuración del Bot*\n\n'
        txt += `📝 *Nombre:* ${cfg.namebot}\n`
        txt += `📢 *Canal:* ${cfg.channel || 'No configurado'}\n`
        txt += `🆔 *ID Canal:* ${cfg.IDchannel || 'No configurado'}\n`
        txt += `👥 *Grupo:* ${cfg.grupo || 'No configurado'}\n`
        txt += `🌐 *Comunidad:* ${cfg.comunidad || 'No configurada'}\n`
        txt += `🖼️ *Icono:* ${cfg.icono ? '✅ Configurado' : '❌ No configurado'}\n`
        txt += `🎨 *Logo:* ${cfg.logo ? '✅ Configurado' : '❌ No configurado'}\n`
        txt += `✏️ *Firma:* ${cfg.firma || 'No configurada'}\n\n`
        txt += `*Uso:*\n`
        txt += `${usedPrefix}config nombre <texto>\n`
        txt += `${usedPrefix}config canal <url>\n`
        txt += `${usedPrefix}config idcanal <id/url/código>\n`
        txt += `${usedPrefix}config grupo <url>\n`
        txt += `${usedPrefix}config comunidad <url>\n`
        txt += `${usedPrefix}config icono <url>\n`
        txt += `${usedPrefix}config logo <url/imagen>\n`
        txt += `${usedPrefix}config firma <texto>\n`
        txt += `${usedPrefix}config todo - Ver todo`
        
        return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    const subCommand = args[0].toLowerCase()
    const value = args.slice(1).join(' ')

    switch (subCommand) {
        case 'nombre':
        case 'name':
        case 'namebot':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona un nombre' }, { quoted: m })
            setBotConfig(m.sender, { namebot: value })
            global.namebot = value
            await conn.sendMessage(m.chat, { text: `✅ Nombre actualizado: *${value}*` }, { quoted: m })
            break

        case 'canal':
        case 'channel':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de canal' }, { quoted: m })
            setBotConfig(m.sender, { channel: value })
            global.channel = value
            await conn.sendMessage(m.chat, { text: `✅ Canal actualizado` }, { quoted: m })
            break

        case 'idcanal':
        case 'idchannel':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona el ID o URL del canal' }, { quoted: m })
            
            await conn.sendMessage(m.chat, { text: '⏳ *Extrayendo ID del canal...*' }, { quoted: m })
            
            const channelId = await extractChannelId(conn, value)
            
            if (!channelId) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ No se pudo extraer la ID del canal.\n\nFormatos aceptados:\n• URL: https://whatsapp.com/channel/XXXX\n• ID numérica: 123456789012345678@newsletter\n• Código: XXXXXXXXXXXXXXXXXXXXXX` 
                }, { quoted: m })
            }
            
            setBotConfig(m.sender, { IDchannel: channelId })
            global.IDchannel = channelId
            
            // Intentar obtener nombre del canal para confirmar
            let channelName = 'Canal'
            try {
                const metadata = await conn.newsletterMetadata("jid", channelId)
                if (metadata && metadata.name) {
                    channelName = metadata.name
                }
            } catch (e) {}
            
            await conn.sendMessage(m.chat, { 
                text: `✅ *ID del canal actualizada*\n\n📝 Nombre: ${channelName}\n🆔 ID: \`${channelId}\`\n\n💡 Esta ID se usará para que tus sub-bots sigan el canal automáticamente.` 
            }, { quoted: m })
            break

        case 'grupo':
        case 'group':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de grupo' }, { quoted: m })
            setBotConfig(m.sender, { grupo: value })
            global.grupo = value
            await conn.sendMessage(m.chat, { text: `✅ Grupo actualizado` }, { quoted: m })
            break

        case 'comunidad':
        case 'community':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de comunidad' }, { quoted: m })
            setBotConfig(m.sender, { comunidad: value })
            global.comunidad = value
            await conn.sendMessage(m.chat, { text: `✅ Comunidad actualizada` }, { quoted: m })
            break

        case 'icono':
        case 'icon':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de imagen' }, { quoted: m })
            setBotConfig(m.sender, { icono: value })
            global.icono = value
            await conn.sendMessage(m.chat, { text: `✅ Icono actualizado` }, { quoted: m })
            break

        case 'logo':
            let logoUrl = value
            
            // Si no hay URL pero hay imagen adjunta
            if (!logoUrl && m.message?.imageMessage) {
                try {
                    const buffer = await conn.downloadMediaMessage(m)
                    logoUrl = await uploadImage(buffer) // Implementar uploadImage
                } catch (e) {
                    return conn.sendMessage(m.chat, { text: '❌ Error al procesar la imagen adjunta' }, { quoted: m })
                }
            }
            // Si responde a una imagen
            else if (!logoUrl && m.quoted?.message?.imageMessage) {
                try {
                    const buffer = await conn.downloadMediaMessage(m.quoted)
                    logoUrl = await uploadImage(buffer)
                } catch (e) {
                    return conn.sendMessage(m.chat, { text: '❌ Error al procesar la imagen mencionada' }, { quoted: m })
                }
            }
            
            if (!logoUrl) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Proporciona una URL, adjunta una imagen o responde a una imagen\n\nEjemplos:\n${usedPrefix}config logo https://ejemplo.com/imagen.jpg\n${usedPrefix}config logo (con imagen adjunta)\n${usedPrefix}config logo (respondiendo a imagen)` 
                }, { quoted: m })
            }
            
            setBotConfig(m.sender, { logo: logoUrl })
            global.logo = logoUrl
            await conn.sendMessage(m.chat, { text: `✅ Logo actualizado` }, { quoted: m })
            break

        case 'firma':
        case 'footer':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona un texto de firma' }, { quoted: m })
            setBotConfig(m.sender, { firma: value })
            global.firma = value
            await conn.sendMessage(m.chat, { text: `✅ Firma actualizada` }, { quoted: m })
            break

        case 'todo':
        case 'all':
        case 'ver':
            const cfg = getBotConfig(m.sender)
            let allTxt = '⚙️ *Configuración Completa*\n\n'
            allTxt += `\`\`\`\n`
            allTxt += `Nombre: ${cfg.namebot}\n`
            allTxt += `Canal: ${cfg.channel}\n`
            allTxt += `ID Canal: ${cfg.IDchannel}\n`
            allTxt += `Grupo: ${cfg.grupo}\n`
            allTxt += `Comunidad: ${cfg.comunidad}\n`
            allTxt += `Icono: ${cfg.icono}\n`
            allTxt += `Logo: ${cfg.logo}\n`
            allTxt += `Firma: ${cfg.firma}\n`
            allTxt += `\`\`\``
            await conn.sendMessage(m.chat, { text: allTxt }, { quoted: m })
            break

        default:
            await conn.sendMessage(m.chat, { 
                text: `❌ Opción desconocida: *${subCommand}*\n\nUsa ${usedPrefix}config para ver las opciones disponibles.` 
            }, { quoted: m })
    }
}

handler.help = ['config']
handler.tags = ['premium']
handler.command = ['config', 'configure', 'setup']
handler.private = true
handler.premium = true

export default handler