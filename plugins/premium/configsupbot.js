import { 
    isPremium, 
    isGlobalOwner,
    allowSubbot,
    disallowSubbot,
    getAllowedSubbots,
    normalize 
} from '../../lib/premium.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
    const userId = normalize(m.sender)
    const isPremiumUser = isPremium(m.sender)
    const isOwner = isGlobalOwner(m.sender)
    
    // Solo premium o owners pueden usar este comando
    if (!isPremiumUser && !isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '👑 Este comando es solo para usuarios *premium*.' 
        }, { quoted: m })
    }

    // Obtener sub-bots actuales del usuario
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

    switch (command) {
        case 'configsupbot':
        case 'supbotconfig':
            if (!args[0]) {
                const allowed = getAllowedSubbots(userId)
                let txt = '⚙️ *Configuración de Sub-bots Premium*\n\n'
                
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
                }
                
                txt += `\n*Comandos:*\n`
                txt += `${usedPrefix}configsupbot permitir <número/mención>\n`
                txt += `${usedPrefix}configsupbot detale <número/mención>\n`
                txt += `${usedPrefix}configsupbot lista - Ver lista de permitidos\n`
                txt += `${usedPrefix}configsupbot limpiar - Permitir todos`
                
                return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }
            
            const subCommand = args[0].toLowerCase()
            
            if (subCommand === 'permitir' || subCommand === 'allow') {
                let target
                if (m.mentionedJid && m.mentionedJid.length > 0) {
                    target = m.mentionedJid[0]
                } else if (args[1]) {
                    target = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                } else {
                    return conn.sendMessage(m.chat, { 
                        text: `❌ Menciona o escribe el número\n\nEjemplo: ${usedPrefix}configsupbot permitir 521XXXXXXXXXX` 
                    }, { quoted: m })
                }
                
                const result = allowSubbot(userId, target)
                await conn.sendMessage(m.chat, { 
                    text: result.message,
                    mentions: result.mentions || []
                }, { quoted: m })
            }
            else if (subCommand === 'detale' || subCommand === 'remove' || subCommand === 'delete') {
                let target
                if (m.mentionedJid && m.mentionedJid.length > 0) {
                    target = m.mentionedJid[0]
                } else if (args[1]) {
                    target = args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
                } else {
                    return conn.sendMessage(m.chat, { 
                        text: `❌ Menciona o escribe el número\n\nEjemplo: ${usedPrefix}configsupbot detale 521XXXXXXXXXX` 
                    }, { quoted: m })
                }
                
                const result = disallowSubbot(userId, target)
                await conn.sendMessage(m.chat, { 
                    text: result.message,
                    mentions: result.mentions || []
                }, { quoted: m })
            }
            else if (subCommand === 'lista' || subCommand === 'list') {
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
                
                await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }
            else if (subCommand === 'limpiar' || subCommand === 'clear') {
                const data = (await import('../../lib/premium.js')).loadAllowedSubbots()
                const { saveAllowedSubbots } = await import('../../lib/premium.js')
                delete data.allowed[userId]
                saveAllowedSubbots(data)
                await conn.sendMessage(m.chat, { 
                    text: '✅ Lista de sub-bots permitidos limpiada. Ahora todos los sub-bots están permitidos.' 
                }, { quoted: m })
            }
            else {
                await conn.sendMessage(m.chat, { 
                    text: `❌ Opción desconocida: *${subCommand}*\n\nUsa ${usedPrefix}configsupbot para ver las opciones.` 
                }, { quoted: m })
            }
            break
    }
}

handler.help = ['configsupbot']
handler.tags = ['premium']
handler.command = ['configsupbot', 'supbotconfig']
handler.private = true
handler.premium = true

export default handler