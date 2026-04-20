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
    const isPremiumUser = (await import('../../lib/premium.js')).isPremium(m.sender)
    const isOwner = (await import('../../lib/premium.js')).isGlobalOwner(m.sender)
    
    let text = `> . ﹡ ﹟ ⚙️ ׄ ⬭ *ᴍᴇɴᴜ ᴅᴇ ᴄᴏɴғɪɢᴜʀᴀᴄɪᴏ́ɴ*\n\n`
    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🤖* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴏɴғɪɢ ᴅᴇʟ ʙᴏᴛ*\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📝 *ɴᴏᴍʙʀᴇ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config nombre <texto>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📢 *ᴄᴀɴᴀʟ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config canal <url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🆔 *ɪᴅ ᴄᴀɴᴀʟ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config idcanal <id/url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 👥 *ɢʀᴜᴘᴏ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config grupo <url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🌐 *ᴄᴏᴍᴜɴɪᴅᴀᴅ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config comunidad <url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🖼️ *ɪᴄᴏɴᴏ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config icono <url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🎨 *ʟᴏɢᴏ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config logo <url>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ ✏️ *ғɪʀᴍᴀ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config firma <texto>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *ᴠᴇʀ ᴛᴏᴅᴏ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config todo\n\n`

    if (isPremiumUser || isOwner) {
        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⭐* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴏɴᴛʀᴏʟ sᴜʙ-ʙᴏᴛs*\n\n`
        
        text += `ׅㅤ𓏸𓈒ㅤׄ ✅ *ᴘᴇʀᴍɪᴛɪʀ sᴜʙ-ʙᴏᴛ* ::\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config supbot <número> permitir\n\n`
        
        text += `ׅㅤ𓏸𓈒ㅤׄ ❌ *ᴇʟɪᴍɪɴᴀʀ sᴜʙ-ʙᴏᴛ* ::\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config supbot <número> delete\n\n`
        
        text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *ʟɪsᴛᴀ ᴘᴇʀᴍɪᴛɪᴅᴏs* ::\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config supbot lista\n\n`
        
        text += `ׅㅤ𓏸𓈒ㅤׄ 🗑️ *ʟɪᴍᴘɪᴀʀ ʟɪsᴛᴀ* ::\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}config supbot limpiar\n\n`
    }

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜👑* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴘʀᴇᴍɪᴜᴍ*\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🎫 *ᴄᴀɴᴊᴇᴀʀ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}canjearp <token>\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ ℹ️ *ᴍɪ ᴘʀᴇᴍɪᴜᴍ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}mipremium\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ ➕ *ᴀɢʀᴇɢᴀʀ sᴜʙ-ʙᴏᴛ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}subprem @usuario\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ ➖ *ʀᴇᴍᴏᴠᴇʀ sᴜʙ-ʙᴏᴛ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}delsubprem @usuario\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📊 *ᴍɪs sᴜʙ-ʙᴏᴛs* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}listsubprem\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 💎 *ɪɴғᴏ ᴘʀᴇᴍɪᴜᴍ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}premium\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🔗* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴇɴʟᴀᴄᴇs*\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 📢 *ʟɪɴᴋs* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}links\n\n`
    
    text += `ׅㅤ𓏸𓈒ㅤׄ 🏓 *ᴘɪɴɢ* ::\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ${usedPrefix}ping\n\n`

    text += `> ✦ *${global.namebot || 'Asta Bot'}* • ᴄᴏɴғɪɢ ᴍᴇɴᴜ`

    await conn.sendMessage(m.chat, { 
        text,
        contextInfo: rcanal 
    }, { quoted: m })
}

handler.help = ['configmenu', 'menuconfig']
handler.tags = ['premium']
handler.command = ['configmenu', 'menuconfig', 'configuracion', 'setupmenu']
handler.private = true

export default handler