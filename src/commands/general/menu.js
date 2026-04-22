import fetch from 'node-fetch'

async function getRcanal() {
    try {
        const thumb = await (await fetch(global.icono)).buffer()
        return { 
            isForwarded: true, 
            forwardedNewsletterMessageInfo: { 
                newsletterJid: global.channelRD?.id || "120363399175402285@newsletter", 
                serverMessageId: '', 
                newsletterName: global.channelRD?.name || "『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』" 
            }, 
            externalAdReply: { 
                title: global.botname || 'ᴀsᴛᴀ-ʙᴏᴛ', 
                body: global.dev || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴇʀɴᴀɴᴅᴏ', 
                mediaType: 1, 
                mediaUrl: global.redes, 
                sourceUrl: global.redes, 
                thumbnail: thumb, 
                showAdAttribution: false, 
                containsAutoReply: true, 
                renderLargerThumbnail: false 
            } 
        }
    } catch { 
        return {} 
    }
}

let handler = async (m, { conn, usedPrefix }) => {
    const rcanal = await getRcanal()
    const userId = m.sender
    const botId = conn.user?.jid || conn.user?.id || ''

    const isOwner = global.owner && global.owner.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === userId
    })

    let text = `> . ﹡ ﹟ 🤖 ׄ ⬭ *ᴍᴇɴᴜ ᴘʀɪɴᴄɪᴘᴀʟ*\n\n`
    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⭐* ㅤ֢ㅤ⸱ㅤᯭִ* — *ɪɴғᴏʀᴍᴀᴄɪóɴ*\n\n`

    text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *ʙᴏᴛ* :: ${global.botname || 'Asta Bot'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 👤 *ᴜsᴜᴀʀɪᴏ* :: ${conn.user?.name || 'Bot'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🆔 *ɪᴅ* :: ${conn.user?.jid?.split('@')[0] || 'Unknown'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 👑 *ᴏᴡɴᴇʀ* :: ${isOwner ? '✅ Sí' : '❌ No'}\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🤖* ㅤ֢ㅤ⸱ㅤᯭִ* — *sᴜʙ-ʙᴏᴛs*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 📲 *${usedPrefix}qr* :: Generar QR\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔢 *${usedPrefix}code* :: Generar código\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *${usedPrefix}bots* :: Mis sub-bots\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🗑️ *${usedPrefix}delsub* :: Eliminar sub-bot\n\n`

    if (isOwner) {
        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜👑* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴏᴡɴᴇʀ*\n\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *${usedPrefix}allbots* :: Ver todos los sub-bots\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🔄 *${usedPrefix}update* :: Actualizar bot\n\n`
    }

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🔗* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴇɴʟᴀᴄᴇs*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔗 *${usedPrefix}links* :: Links del bot\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🏓 *${usedPrefix}ping* :: Velocidad del bot\n\n`

    text += `> ✦ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${global.dev || 'ғᴇʀɴᴀɴᴅᴏ'}`

    await conn.sendMessage(m.chat, { 
        text,
        contextInfo: rcanal 
    }, { quoted: m })
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help', 'comandos', 'allmenu', 'start', 'inicio']

export default handler
