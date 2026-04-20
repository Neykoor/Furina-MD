import { 
    isPremium, 
    setBotConfig, 
    getBotConfig, 
    normalize, 
    isGlobalOwner,
    allowSubbot,
    disallowSubbot,
    getAllowedSubbots,
    isSubbotPremium,
    getPremiumOwnerOfSubbot,
    isAllowedSubbot
} from '../../lib/premium.js'

async function extractChannelId(conn, input) {
    if (!input) return null
    if (input.includes('@newsletter')) return input.trim()
    const inviteMatch = input.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/channel\/([0-9A-Za-z]{22,24})/i)
    if (inviteMatch?.[1]) {
        try {
            const metadata = await conn.newsletterMetadata("invite", inviteMatch[1])
            return metadata?.id || null
        } catch (e) {
            return null
        }
    }
    if (/^\d+$/.test(input)) return `${input}@newsletter`
    return null
}

async function getChannelName(conn, channelId) {
    if (!channelId) return null
    try {
        const metadata = await conn.newsletterMetadata("jid", channelId)
        return metadata?.name || null
    } catch (e) {
        return null
    }
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
    const botId = conn.user?.jid || conn.user?.id || 'main'
    const botNumber = normalize(botId)
    const userId = normalize(m.sender)
    
    const isMainBot = !conn.isSubBot && (conn.isMainBot === true || !conn.ownerId)
    const isSubBot = conn.isSubBot === true || conn.ownerId !== undefined
    
    if (isMainBot) {
        return conn.sendMessage(m.chat, { 
            text: '❌ Este comando solo está disponible para *bots premium*.' 
        }, { quoted: m })
    }
    
    const isPremiumUser = isPremium(m.sender)
    const isOwner = isGlobalOwner(m.sender)
    const isBotPremium = isSubbotPremium(botNumber)
    
    if (!isPremiumUser && !isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '⭐ Este comando es solo para *usuarios premium* y *owners*.' 
        }, { quoted: m })
    }
    
    if (isSubBot && isBotPremium) {
        const premiumOwner = getPremiumOwnerOfSubbot(botNumber)
        if (premiumOwner && !isAllowedSubbot(botNumber, premiumOwner)) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Este sub-bot no tiene permiso del premium owner.' 
            }, { quoted: m })
        }
    }

    if (!args[0]) {
        let txt = '⚙️ *Configuración Premium*\n\n'
        txt += `🤖 *Bot:* Sub-bot Premium\n`
        txt += `🆔 *ID:* ${botId.split('@')[0]}\n`
        txt += `⭐ *Usuario:* ${isOwner ? '👑 Owner Global' : '⭐ Premium'}\n\n`

        txt += `*📋 General:*\n`
        txt += `${usedPrefix}config nombre <texto>\n`
        txt += `${usedPrefix}config canal <url> [nombre]\n`
        txt += `${usedPrefix}config canalid <id/url>\n`
        txt += `${usedPrefix}config grupo <url>\n`
        txt += `${usedPrefix}config comunidad <url>\n`
        txt += `${usedPrefix}config icono <url>\n`
        txt += `${usedPrefix}config logo <url/imagen>\n`
        txt += `${usedPrefix}config firma <texto>\n`
        txt += `${usedPrefix}config todo\n\n`

        txt += `*⭐ Sub-bots Permitidos:*\n`
        txt += `${usedPrefix}config supbot <número> permitir\n`
        txt += `${usedPrefix}config supbot <número> delete\n`
        txt += `${usedPrefix}config supbot lista\n`
        txt += `${usedPrefix}config supbot limpiar\n\n`

        txt += `*Ejemplos:*\n`
        txt += `${usedPrefix}config nombre Asta Bot Pro\n`
        txt += `${usedPrefix}config canal https://whatsapp.com/channel/XXX MiCanal\n`
        txt += `${usedPrefix}config supbot 521XXXXXXXXXX permitir`

        return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    }

    const subCommand = args[0].toLowerCase()

    if (subCommand === 'supbot' || subCommand === 'subbot') {
        if (!isPremiumUser && !isOwner) {
            return conn.sendMessage(m.chat, { 
                text: '👑 Solo usuarios *premium* pueden gestionar sub-bots.' 
            }, { quoted: m })
        }

        if (!args[1]) {
            const allowed = getAllowedSubbots(userId)
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

            let txt = '⚙️ *Control de Sub-bots*\n\n'
            txt += `👤 *ID:* ${userId}\n`
            txt += `⭐ ${isOwner ? '👑 Owner Global' : '⭐ Premium'}\n\n`

            txt += `🤖 *Conectados:*\n`
            if (userSubBots.length === 0) {
                txt += `   _Ninguno_\n`
            } else {
                userSubBots.forEach((bot, i) => {
                    const isAllowed = allowed.includes(normalize(bot.id))
                    txt += `${i + 1}. ${isAllowed ? '✅' : '❌'} *${bot.name}*\n`
                    txt += `   📱 ${bot.id}\n`
                })
            }

            txt += `\n📋 *Permitidos:*\n`
            if (allowed.length === 0) {
                txt += `   _Todos (modo libre)_\n`
            } else {
                allowed.forEach((num, i) => txt += `${i + 1}. ✅ +${num}\n`)
                txt += `\nTotal: ${allowed.length}`
            }

            txt += `\n\n*Uso:*\n`
            txt += `${usedPrefix}config supbot <número> permitir/delete/lista/limpiar`

            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        let target = null
        let action = null

        if (m.mentionedJid?.length > 0) {
            target = m.mentionedJid[0]
            const mentionIndex = args.findIndex(arg => arg.includes('@'))
            if (mentionIndex !== -1 && args[mentionIndex + 1]) {
                action = args[mentionIndex + 1].toLowerCase()
            } else if (args[2]) {
                action = args[2].toLowerCase()
            }
        } else {
            const possibleNumber = args[1].replace(/[^0-9]/g, '')
            if (possibleNumber.length >= 10) {
                target = possibleNumber + '@s.whatsapp.net'
                action = args[2]?.toLowerCase()
            } else {
                action = args[1].toLowerCase()
            }
        }

        if (action === 'lista' || action === 'list' || (args[1] && args[1].toLowerCase() === 'lista')) {
            const allowed = getAllowedSubbots(userId)
            let txt = '📋 *Sub-bots Permitidos*\n\n'
            if (allowed.length === 0) {
                txt += '_Todos (modo libre)_'
            } else {
                allowed.forEach((num, i) => txt += `${i + 1}. ✅ +${num}\n`)
                txt += `\nTotal: ${allowed.length}`
            }
            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        if (action === 'limpiar' || action === 'clear' || (args[1] && args[1].toLowerCase() === 'limpiar')) {
            const { loadAllowedSubbots, saveAllowedSubbots } = await import('../../lib/premium.js')
            const data = loadAllowedSubbots()
            delete data.allowed[userId]
            saveAllowedSubbots(data)
            return conn.sendMessage(m.chat, { 
                text: '✅ Lista limpiada. Todos los sub-bots permitidos.' 
            }, { quoted: m })
        }

        if (!target) {
            return conn.sendMessage(m.chat, { 
                text: `❌ Especifica número o mención\n\nEjemplo:\n${usedPrefix}config supbot 521XXXXXXXXXX permitir` 
            }, { quoted: m })
        }

        if (!action) {
            return conn.sendMessage(m.chat, { 
                text: `❌ Especifica acción: *permitir* o *delete*\n\nEjemplo:\n${usedPrefix}config supbot ${args[1]} permitir` 
            }, { quoted: m })
        }

        if (action === 'permitir' || action === 'allow') {
            const result = allowSubbot(userId, target)
            await conn.sendMessage(m.chat, { 
                text: result.message,
                mentions: result.mentions || []
            }, { quoted: m })
        }
        else if (action === 'delete' || action === 'del' || action === 'eliminar') {
            const result = disallowSubbot(userId, target)
            await conn.sendMessage(m.chat, { 
                text: result.message,
                mentions: result.mentions || []
            }, { quoted: m })
        }
        else {
            await conn.sendMessage(m.chat, { 
                text: `❌ Acción desconocida: *${action}*\nUsa: *permitir* o *delete*` 
            }, { quoted: m })
        }

        return
    }

    const value = args.slice(1).join(' ')

    switch (subCommand) {
        case 'nombre':
        case 'name':
        case 'namebot':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona un nombre' }, { quoted: m })
            setBotConfig(userId, { namebot: value })
            global.namebot = value
            await conn.sendMessage(m.chat, { text: `✅ Nombre: *${value}*` }, { quoted: m })
            break

        case 'canal':
        case 'channel': {
            if (!args[1]) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Proporciona URL y opcionalmente nombre\n\nEjemplo:\n${usedPrefix}config canal https://whatsapp.com/channel/XXX MiCanal` 
                }, { quoted: m })
            }

            const urls = []
            const names = []
            let i = 1

            while (i < args.length) {
                const arg = args[i]
                if (arg.includes('whatsapp.com/channel/') || arg.includes('@newsletter') || /^\d+$/.test(arg)) {
                    urls.push(arg)
                    i++
                } else {
                    names.push(args.slice(i).join(' '))
                    break
                }
            }

            if (urls.length === 0) {
                return conn.sendMessage(m.chat, { text: '❌ No se detectó URL válida' }, { quoted: m })
            }

            const maxChannels = 3
            const channelsToProcess = urls.slice(0, maxChannels)
            const channelData = []

            await conn.sendMessage(m.chat, { text: '⏳ *Procesando...*' }, { quoted: m })

            for (let idx = 0; idx < channelsToProcess.length; idx++) {
                const url = channelsToProcess[idx]
                const channelId = await extractChannelId(conn, url)

                if (channelId) {
                    let channelName = names[idx] || names[0] || null
                    if (!channelName) {
                        channelName = await getChannelName(conn, channelId) || `Canal ${idx + 1}`
                    }

                    channelData.push({
                        id: channelId,
                        url: url.includes('http') ? url : `https://whatsapp.com/channel/${url}`,
                        name: channelName
                    })
                }
            }

            if (channelData.length === 0) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ ID no válida.\nFormatos:\n• https://whatsapp.com/channel/XXXX\n• 123...@newsletter` 
                }, { quoted: m })
            }

            const cfg = getBotConfig(userId)
            const existingChannels = cfg.channels || []
            const newChannels = [...existingChannels.filter(ec => !channelData.some(nc => nc.id === ec.id))]
            newChannels.push(...channelData)
            const finalChannels = newChannels.slice(0, maxChannels)

            setBotConfig(userId, { 
                channels: finalChannels,
                channel: finalChannels[0]?.url || '',
                IDchannel: finalChannels[0]?.id || ''
            })

            global.channels = finalChannels
            global.channel = finalChannels[0]?.url || global.channel || ''
            global.IDchannel = finalChannels[0]?.id || global.IDchannel || ''

            let txt = `✅ *Canales actualizados*\n\n`
            finalChannels.forEach((ch, idx) => {
                txt += `${idx + 1}. *${ch.name}*\n`
                txt += `   🆔 \`${ch.id}\`\n`
                txt += `   🔗 ${ch.url}\n\n`
            })

            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            break
        }

        case 'canalid':
        case 'idcanal':
        case 'idchannel':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona ID o URL' }, { quoted: m })

            await conn.sendMessage(m.chat, { text: '⏳ *Extrayendo...*' }, { quoted: m })

            const channelId = await extractChannelId(conn, value)

            if (!channelId) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ ID no válida.\nFormatos:\n• https://whatsapp.com/channel/XXXX\n• 123...@newsletter` 
                }, { quoted: m })
            }

            setBotConfig(userId, { IDchannel: channelId })
            global.IDchannel = channelId

            let channelName = 'Canal'
            try {
                const metadata = await conn.newsletterMetadata("jid", channelId)
                if (metadata?.name) channelName = metadata.name
            } catch (e) {}

            await conn.sendMessage(m.chat, { 
                text: `✅ *Canal actualizado*\n\n📝 ${channelName}\n🆔 \`${channelId}\`` 
            }, { quoted: m })
            break

        case 'grupo':
        case 'group':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona URL' }, { quoted: m })
            setBotConfig(userId, { grupo: value })
            global.grupo = value
            await conn.sendMessage(m.chat, { text: `✅ Grupo actualizado` }, { quoted: m })
            break

        case 'comunidad':
        case 'community':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona URL' }, { quoted: m })
            setBotConfig(userId, { comunidad: value })
            global.comunidad = value
            await conn.sendMessage(m.chat, { text: `✅ Comunidad actualizada` }, { quoted: m })
            break

        case 'icono':
        case 'icon':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona URL' }, { quoted: m })
            setBotConfig(userId, { icono: value })
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
                    return conn.sendMessage(m.chat, { text: '❌ Error imagen adjunta' }, { quoted: m })
                }
            }
            else if (!logoUrl && m.quoted?.message?.imageMessage) {
                try {
                    const buffer = await conn.downloadMediaMessage(m.quoted)
                    logoUrl = await uploadImage(buffer)
                } catch (e) {
                    return conn.sendMessage(m.chat, { text: '❌ Error imagen mencionada' }, { quoted: m })
                }
            }

            if (!logoUrl) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Proporciona URL, adjunta imagen o responde a una\n\nEjemplo:\n${usedPrefix}config logo https://ejemplo.com/img.jpg` 
                }, { quoted: m })
            }

            setBotConfig(userId, { logo: logoUrl })
            global.logo = logoUrl
            await conn.sendMessage(m.chat, { text: `✅ Logo actualizado` }, { quoted: m })
            break

        case 'firma':
        case 'footer':
            if (!value) return conn.sendMessage(m.chat, { text: '❌ Proporciona texto' }, { quoted: m })
            setBotConfig(userId, { firma: value })
            global.firma = value
            await conn.sendMessage(m.chat, { text: `✅ Firma actualizada` }, { quoted: m })
            break

        case 'todo':
        case 'all':
        case 'ver':
            const cfg = getBotConfig(userId)
            let allTxt = '⚙️ *Configuración*\n\n'
            allTxt += `🤖 Sub-bot Premium\n`
            allTxt += `🆔 ${botId.split('@')[0]}\n\n`
            allTxt += `\`\`\`\n`
            allTxt += `Nombre: ${cfg.namebot}\n`
            allTxt += `Canales: ${(cfg.channels || []).map(c => c.name).join(', ') || cfg.channel}\n`
            allTxt += `ID: ${cfg.IDchannel}\n`
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
                text: `❌ Opción desconocida: *${subCommand}*\nUsa ${usedPrefix}config para ver opciones.` 
            }, { quoted: m })
    }
}

handler.help = ['config']
handler.tags = ['premium']
handler.command = ['config', 'configure', 'setup']
handler.premiumOnly = true

export default handler

async function uploadImage(buffer) {
    throw new Error('Función uploadImage no implementada. Usa URL directa.')
}