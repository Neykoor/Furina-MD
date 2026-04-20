import { 
    isPremium, 
    setBotConfig, 
    getBotConfig, 
    normalize, 
    isGlobalOwner,
    allowSubbot,
    disallowSubbot,
    getAllowedSubbots 
} from '../../lib/premium.js'

// Función para extraer ID de canal desde URL o input
async function extractChannelId(conn, input) {
    if (!input) return null
    
    if (input.includes('@newsletter')) {
        return input.trim()
    }
    
    const inviteMatch = input.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/channel\/([0-9A-Za-z]{22,24})/i)
    if (inviteMatch && inviteMatch[1]) {
        try {
            const metadata = await conn.newsletterMetadata("invite", inviteMatch[1])
            if (metadata && metadata.id) {
                return metadata.id
            }
        } catch (e) {
            console.error('Error obteniendo metadata del canal:', e.message)
            return null
        }
    }
    
    if (/^\d+$/.test(input)) {
        return `${input}@newsletter`
    }
    
    return null
}

// Verificar si el usuario es owner del bot actual (principal o sub-bot)
function isBotOwner(m, conn) {
    if (isGlobalOwner(m.sender)) return true
    
    if (conn.isSubBot || conn.ownerId) {
        const subBotOwner = normalize(conn.ownerId || '')
        const sender = normalize(m.sender)
        return subBotOwner === sender
    }
    
    const sender = normalize(m.sender)
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => normalize(Array.isArray(o) ? o[0] : o) === sender)
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
    // Verificar si es owner del bot actual
    if (!isBotOwner(m, conn)) {
        return conn.sendMessage(m.chat, { 
            text: '👑 Este comando solo puede ser usado por el *owner* de este bot.' 
        }, { quoted: m })
    }

    const botId = conn.user?.jid || conn.user?.id || 'main'
    const userId = normalize(m.sender)
    const isPremiumUser = isPremium(m.sender)
    const isOwner = isGlobalOwner(m.sender)

    // Si no hay argumentos, mostrar menú principal
    if (!args[0]) {
        let txt = '⚙️ *Configuración del Bot*\n\n'
        txt += `🤖 *Bot:* ${conn.isSubBot ? 'Sub-bot' : 'Principal'}\n`
        txt += `🆔 *ID:* ${botId.split('@')[0]}\n\n`
        
        txt += `*📋 Configuración General:*\n`
        txt += `${usedPrefix}config nombre <texto>\n`
        txt += `${usedPrefix}config canal <url>\n`
        txt += `${usedPrefix}config idcanal <id/url/código>\n`
        txt += `${usedPrefix}config grupo <url>\n`
        txt += `${usedPrefix}config comunidad <url>\n`
        txt += `${usedPrefix}config icono <url>\n`
        txt += `${usedPrefix}config logo <url/imagen>\n`
        txt += `${usedPrefix}config firma <texto>\n`
        txt += `${usedPrefix}config todo - Ver configuración\n\n`
        
        if (isPremiumUser || isOwner) {
            txt += `*⭐ Control de Sub-bots Premium:*\n`
            txt += `${usedPrefix}config supbot <número/mención> permitir\n`
            txt += `${usedPrefix}config supbot <número/mención> delete\n`
            txt += `${usedPrefix}config supbot lista - Ver permitidos\n`
            txt += `${usedPrefix}config supbot limpiar - Permitir todos\n\n`
        }
        
        txt += `*Ejemplos:*\n`
        txt += `${usedPrefix}config nombre Asta Bot Pro\n`
        txt += `${usedPrefix}config supbot 521XXXXXXXXXX permitir\n`
        txt += `${usedPrefix}config supbot @usuario delete`
        
        return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    const subCommand = args[0].toLowerCase()

    // ============ CONFIGURACIÓN DE SUB-BOTS PREMIUM ============
    if (subCommand === 'supbot' || subCommand === 'subbot') {
        // Solo premium o owners pueden usar esta sección
        if (!isPremiumUser && !isOwner) {
            return conn.sendMessage(m.chat, { 
                text: '👑 Esta función es solo para usuarios *premium*.' 
            }, { quoted: m })
        }

        // Si solo escribió "config supbot" sin más args
        if (!args[1]) {
            const allowed = getAllowedSubbots(userId)
            
            // Obtener sub-bots conectados del usuario
            const userSubBots = []
            for (const [key, data] of global.subBotsData || []) {
                if (data?.owner && normalize(data.owner) === userId) {
                    userSubBots.push({
                        id: data.userId,
                        name: data.name || 'SubBot',
                        jid: data.jid
                    })
                }
            }
            
            let txt = '⚙️ *Control de Sub-bots Premium*\n\n'
            txt += `👤 *Tu ID:* ${userId}\n`
            txt += `⭐ *Estado:* ${isOwner ? '👑 Owner Global' : '⭐ Premium'}\n\n`
            
            txt += `🤖 *Tus Sub-bots Conectados:*\n`
            if (userSubBots.length === 0) {
                txt += `   _No tienes sub-bots conectados_\n`
            } else {
                userSubBots.forEach((bot, i) => {
                    const isAllowed = allowed.includes(normalize(bot.id))
                    txt += `${i + 1}. ${isAllowed ? '✅' : '❌'} *${bot.name}*\n`
                    txt += `   📱 ${bot.id}\n`
                })
            }
            
            txt += `\n📋 *Sub-bots Permitidos:*\n`
            if (allowed.length === 0) {
                txt += `   _Todos los sub-bots están permitidos (modo libre)_\n`
            } else {
                allowed.forEach((num, i) => {
                    txt += `${i + 1}. ✅ +${num}\n`
                })
                txt += `\nTotal: ${allowed.length} sub-bot(s) permitido(s)`
            }
            
            txt += `\n\n*Uso:*\n`
            txt += `${usedPrefix}config supbot <número/mención> permitir\n`
            txt += `${usedPrefix}config supbot <número/mención> delete\n`
            txt += `${usedPrefix}config supbot lista\n`
            txt += `${usedPrefix}config supbot limpiar`
            
            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        // Obtener target (número o mención)
        let target = null
        let action = null

        // Buscar mención en el mensaje
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            target = m.mentionedJid[0]
            // El action sería el siguiente argumento después de la mención
            const mentionIndex = args.findIndex(arg => arg.includes('@'))
            if (mentionIndex !== -1 && args[mentionIndex + 1]) {
                action = args[mentionIndex + 1].toLowerCase()
            } else if (args[2]) {
                action = args[2].toLowerCase()
            }
        } 
        // Si no hay mención, buscar número en args[1] y acción en args[2]
        else {
            const possibleNumber = args[1].replace(/[^0-9]/g, '')
            if (possibleNumber.length >= 10) {
                target = possibleNumber + '@s.whatsapp.net'
                action = args[2]?.toLowerCase()
            } else {
                // Podría ser una acción directa (lista/limpiar)
                action = args[1].toLowerCase()
            }
        }

        // Procesar acciones que no requieren target
        if (action === 'lista' || action === 'list' || (args[1] && args[1].toLowerCase() === 'lista')) {
            const allowed = getAllowedSubbots(userId)
            let txt = '📋 *Sub-bots Permitidos*\n\n'
            
            if (allowed.length === 0) {
                txt += '_Todos los sub-bots están permitidos (modo libre)_'
            } else {
                allowed.forEach((num, i) => {
                    txt += `${i + 1}. ✅ +${num}\n`
                })
                txt += `\nTotal: ${allowed.length} sub-bot(s) permitido(s)`
            }
            
            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        if (action === 'limpiar' || action === 'clear' || (args[1] && args[1].toLowerCase() === 'limpiar')) {
            const { loadAllowedSubbots, saveAllowedSubbots } = await import('../../lib/premium.js')
            const data = loadAllowedSubbots()
            delete data.allowed[userId]
            saveAllowedSubbots(data)
            return conn.sendMessage(m.chat, { 
                text: '✅ Lista de sub-bots permitidos limpiada. Ahora todos los sub-bots están permitidos.' 
            }, { quoted: m })
        }

        // Validar que tenemos target y acción para permitir/delete
        if (!target) {
            return conn.sendMessage(m.chat, { 
                text: `❌ Debes especificar un número o mencionar a un usuario\n\nEjemplo:\n${usedPrefix}config supbot 521XXXXXXXXXX permitir\n${usedPrefix}config supbot @usuario delete` 
            }, { quoted: m })
        }

        if (!action) {
            return conn.sendMessage(m.chat, { 
                text: `❌ Debes especificar la acción: *permitir* o *delete*\n\nEjemplo:\n${usedPrefix}config supbot ${args[1]} permitir` 
            }, { quoted: m })
        }

        // Ejecutar acción
        if (action === 'permitir' || action === 'allow' || action === 'permitido') {
            const result = allowSubbot(userId, target)
            await conn.sendMessage(m.chat, { 
                text: result.message,
                mentions: result.mentions || []
            }, { quoted: m })
        }
        else if (action === 'delete' || action === 'del' || action === 'detale' || action === 'eliminar' || action === 'remover') {
            const result = disallowSubbot(userId, target)
            await conn.sendMessage(m.chat, { 
                text: result.message,
                mentions: result.mentions || []
            }, { quoted: m })
        }
        else {
            await conn.sendMessage(m.chat, { 
                text: `❌ Acción desconocida: *${action}*\n\nUsa: *permitir* o *delete*` 
            }, { quoted: m })
        }
        
        return
    }

    // ============ CONFIGURACIÓN GENERAL DEL BOT ============
    const value = args.slice(1).join(' ')

    switch (subCommand) {
        case 'nombre':
        case 'name':
        case 'namebot':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona un nombre' }, { quoted: m })
            setBotConfig(botId, { namebot: value })
            global.namebot = value
            await conn.sendMessage(m.chat, { text: `✅ Nombre actualizado: *${value}*` }, { quoted: m })
            break

        case 'canal':
        case 'channel':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de canal' }, { quoted: m })
            setBotConfig(botId, { channel: value })
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
            
            setBotConfig(botId, { IDchannel: channelId })
            global.IDchannel = channelId
            
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
            setBotConfig(botId, { grupo: value })
            global.grupo = value
            await conn.sendMessage(m.chat, { text: `✅ Grupo actualizado` }, { quoted: m })
            break

        case 'comunidad':
        case 'community':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de comunidad' }, { quoted: m })
            setBotConfig(botId, { comunidad: value })
            global.comunidad = value
            await conn.sendMessage(m.chat, { text: `✅ Comunidad actualizada` }, { quoted: m })
            break

        case 'icono':
        case 'icon':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona una URL de imagen' }, { quoted: m })
            setBotConfig(botId, { icono: value })
            global.icono = value
            await conn.sendMessage(m.chat, { text: `✅ Icono actualizado` }, { quoted: m })
            break

        case 'logo':
            let logoUrl = value
            
            if (!logoUrl && m.message?.imageMessage) {
                try {
                    const buffer = await conn.downloadMediaMessage(m)
                    logoUrl = await uploadImage(buffer)
                } catch (e) {
                    return conn.sendMessage(m.chat, { text: '❌ Error al procesar la imagen adjunta' }, { quoted: m })
                }
            }
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
            
            setBotConfig(botId, { logo: logoUrl })
            global.logo = logoUrl
            await conn.sendMessage(m.chat, { text: `✅ Logo actualizado` }, { quoted: m })
            break

        case 'firma':
        case 'footer':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona un texto de firma' }, { quoted: m })
            setBotConfig(botId, { firma: value })
            global.firma = value
            await conn.sendMessage(m.chat, { text: `✅ Firma actualizada` }, { quoted: m })
            break

        case 'todo':
        case 'all':
        case 'ver':
            const cfg = getBotConfig(botId)
            let allTxt = '⚙️ *Configuración Completa*\n\n'
            allTxt += `🤖 *Bot:* ${conn.isSubBot ? 'Sub-bot' : 'Principal'}\n`
            allTxt += `🆔 *ID:* ${botId.split('@')[0]}\n\n`
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
handler.owner = true

export default handler

// Función auxiliar para subir imágenes (placeholder - implementar con tu servicio preferido)
async function uploadImage(buffer) {
    throw new Error('Función uploadImage no implementada. Usa una URL directa.')
}