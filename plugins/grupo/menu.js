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
    const isMainBot = !conn.isSubBot && (conn.isMainBot === true || !conn.ownerId)
    const isSubBot = conn.isSubBot === true || conn.ownerId !== undefined

    const isOwner = global.owner && global.owner.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === userId
    })

    const isPremium = global.db?.data?.users?.[userId]?.premium || false

    let text = `> . ﹡ ﹟ 🤖 ׄ ⬭ *ᴍᴇɴᴜ ᴘʀɪɴᴄɪᴘᴀʟ*\n\n`
    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⭐* ㅤ֢ㅤ⸱ㅤᯭִ* — *ɪɴғᴏʀᴍᴀᴄɪóɴ*\n\n`

    text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *ʙᴏᴛ* :: ${global.botname || 'Asta Bot'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 👤 *ᴜsᴜᴀʀɪᴏ* :: ${conn.user?.name || 'Bot'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🆔 *ɪᴅ* :: ${conn.user?.jid?.split('@')[0] || 'Unknown'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ⭐ *ᴇsᴛᴀᴅᴏ* :: ${isPremium ? '👑 Premium' : '👤 Normal'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 👑 *ᴏᴡɴᴇʀ* :: ${isOwner ? '✅ Sí' : '❌ No'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔄 *ᴛɪᴘᴏ* :: ${isMainBot ? '📌 Principal' : '🤖 Sub-bot'}\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🤖* ㅤ֢ㅤ⸱ㅤᯭִ* — *sᴜʙ-ʙᴏᴛs*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 📲 *${usedPrefix}qr* :: Generar QR\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔢 *${usedPrefix}code* :: Generar código\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *${usedPrefix}listsub* :: Ver sub-bots\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🗑️ *${usedPrefix}delsub* :: Eliminar sub-bot\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔄 *${usedPrefix}restartsub* :: Reiniciar sub-bot\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 💀 *${usedPrefix}killallsub* :: Eliminar todos\n\n`


        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚙️* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴏɴғɪɢᴜʀᴀᴄɪóɴ ᴘʀᴇᴍɪᴜᴍ*\n\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📝 *${usedPrefix}config nombre* :: Nombre del bot\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📢 *${usedPrefix}config canal* :: Canal (hasta 3)\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🆔 *${usedPrefix}config canalid* :: ID de canal\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 👥 *${usedPrefix}config grupo* :: Grupo\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🌐 *${usedPrefix}config comunidad* :: Comunidad\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🖼️ *${usedPrefix}config icono* :: Icono\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🎨 *${usedPrefix}config logo* :: Logo\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ✍️ *${usedPrefix}config firma* :: Firma\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *${usedPrefix}config supbot* :: Gestionar sub-bots\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📊 *${usedPrefix}config todo* :: Ver config\n\n`

        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📌* ㅤ֢ㅤ⸱ㅤᯭִ* — *ʙᴏᴛ ᴘʀɪɴᴄɪᴘᴀʟ*\n\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ⚠️ Configuración bloqueada\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🔒 Usa datos oficiales del bot\n\n`

        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜👑* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴘʀᴇᴍɪᴜᴍ*\n\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 💎 *${usedPrefix}mipremium* :: Mi info premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ⭐ *${usedPrefix}subprem* :: Asignar sub-premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ ❌ *${usedPrefix}delsubprem* :: Quitar sub-premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *${usedPrefix}listsubprem* :: Mis sub-premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🎁 *${usedPrefix}premregalar* :: Regalar premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🎫 *${usedPrefix}canjearp* :: Canjear token\n\n`

        text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🔐* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴏᴡɴᴇʀ*\n\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🎫 *${usedPrefix}tokenp* :: Generar token\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 📋 *${usedPrefix}tokenlist* :: Lista tokens\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 👑 *${usedPrefix}premiumlist* :: Usuarios premium\n`
        text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *${usedPrefix}subpremlist* :: Sub-bots premium\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🔗* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴇɴʟᴀᴄᴇs*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🔗 *${usedPrefix}links* :: Links del bot\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🏓 *${usedPrefix}ping* :: Velocidad del bot\n\n`


    await conn.sendMessage(m.chat, { 
        text,
        contextInfo: rcanal 
    }, { quoted: m })
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help', 'comandos', 'allmenu', 'start', 'inicio']

export default handler