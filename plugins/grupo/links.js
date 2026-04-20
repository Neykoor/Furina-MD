import fetch from 'node-fetch'

async function getRcanal() {
    try {
        const thumb = await (await fetch(global.icono)).buffer()
        return { 
            isForwarded: true, 
            forwardedNewsletterMessageInfo: { 
                newsletterJid: global.IDchannel || "120363399175402285@newsletter", 
                serverMessageId: '', 
                newsletterName: global.namebot || "『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』" 
            }, 
            externalAdReply: { 
                title: global.namebot || 'ᴀsᴛᴀ-ʙᴏᴛ', 
                body: global.dev || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴇʀɴᴀɴᴅᴏ', 
                mediaType: 1, 
                mediaUrl: global.channel, 
                sourceUrl: global.channel, 
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
    
    let text = `> . ﹡ ﹟ 🔗 ׄ ⬭ *ʟɪɴᴋs ᴅᴇʟ ʙᴏᴛ*\n\n`
    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📢* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴀɴᴀʟ ᴏғɪᴄɪᴀʟ*\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📢 *ᴄᴀɴᴀʟ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${global.channel || 'No configurado'}\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🆔 *ᴄʜᴀɴɴᴇʟ ɪᴅ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ \`${global.IDchannel || 'No configurado'}\`\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 👥 *ɢʀᴜᴘᴏ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${global.grupo || 'No configurado'}\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🌐 *ᴄᴏᴍᴜɴɪᴅᴀᴅ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${global.comunidad || 'No configurada'}\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🐙 *ɢɪᴛʜᴜʙ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${global.github || 'No configurado'}\n\n`
    
    text += `> ✦ ᴘᴀʀᴀ ᴇᴅɪᴛᴀʀ ᴜsᴀ *${usedPrefix}config*`

    await conn.sendMessage(m.chat, { 
        text,
        contextInfo: rcanal 
    }, { quoted: m })
}

handler.help = ['links', 'redes', 'social']
handler.tags = ['tools']
handler.command = ['links', 'link', 'redes', 'red', 'social', 'canales']

export default handler