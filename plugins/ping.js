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

let handler = async (m, { conn }) => {
    const start = Date.now()
    const rcanal = await getRcanal()
    
    // Enviar mensaje inicial
    const sent = await conn.sendMessage(m.chat, { 
        text: '⏱️ *Calculando ping...*',
        contextInfo: rcanal
    }, { quoted: m })
    
    const end = Date.now()
    const ping = end - start
    
    // Editar el mensaje con el resultado
    await conn.sendMessage(m.chat, { 
        text: `> . ﹡ ﹟ 🏓 ׄ ⬭ *ᴘᴏɴɢ*\n\nׅㅤ𓏸𓈒ㅤׄ 📡 *ʟᴀᴛᴇɴᴄɪᴀ* :: *${ping}ms*\nׅㅤ𓏸𓈒ㅤׄ ⚡ *ᴠᴇʟᴏᴄɪᴅᴀᴅ* :: *${(ping / 1000).toFixed(3)}s*\n\n> ✦ *${global.namebot || 'Asta Bot'}*`,
        edit: sent.key,
        contextInfo: rcanal
    })
}

handler.help = ['ping']
handler.tags = ['tools']
handler.command = ['ping', 'pong', 'speed']

export default handler