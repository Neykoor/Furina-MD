import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

let handler = async (m, { conn }) => {
    const rcanal = await getRcanal()

    const start = Date.now()
    await conn.sendMessage(m.chat, { text: '⏳' }, { quoted: m })
    const end = Date.now()
    const botPing = end - start

    let serverPing = 0
    try {
        const { stdout } = await execAsync('ping -c 1 8.8.8.8')
        const match = stdout.match(/time=(\d+\.?\d*)/)
        if (match) serverPing = Math.round(parseFloat(match[1]))
    } catch {
        serverPing = 0
    }

    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)

    const uptimeStr = []
    if (days > 0) uptimeStr.push(`${days}d`)
    if (hours > 0) uptimeStr.push(`${hours}h`)
    if (minutes > 0) uptimeStr.push(`${minutes}m`)
    uptimeStr.push(`${seconds}s`)

    const memUsage = process.memoryUsage()
    const ramUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2)
    const ramTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2)

    const subBotsCount = global.subBots?.size || 0
    const usersCount = Object.keys(global.db?.data?.users || {}).length
    const chatsCount = Object.keys(global.db?.data?.chats || {}).length

    let text = `> . ﹡ ﹟ 🏓 ׄ ⬭ *ᴘɪɴɢ ᴅᴇʟ ʙᴏᴛ*\n\n`
    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📊* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴇsᴛᴀᴅɪsᴛɪᴄᴀs*\n\n`

    text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *ʙᴏᴛ* :: ${global.botname || 'Asta Bot'}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🏓 *ʙᴏᴛ ᴘɪɴɢ* :: ${botPing}ms\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🌐 *sᴇʀᴠɪᴅᴏʀ* :: ${serverPing > 0 ? serverPing + 'ms' : 'N/A'}\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⏱️* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴛɪᴇᴍᴘᴏ ᴀᴄᴛɪᴠᴏ*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ ⏱️ *ᴜᴘᴛɪᴍᴇ* :: ${uptimeStr.join(' ')}\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜💾* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴍᴇᴍᴏʀɪᴀ*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 💾 *ʀᴀᴍ* :: ${ramUsed}MB / ${ramTotal}MB\n\n`

    text += `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜👥* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴜsᴜᴀʀɪᴏs*\n\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 👤 *ᴜsᴜᴀʀɪᴏs* :: ${usersCount}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 💬 *ᴄʜᴀᴛs* :: ${chatsCount}\n`
    text += `ׅㅤ𓏸𓈒ㅤׄ 🤖 *sᴜʙ-ʙᴏᴛs* :: ${subBotsCount}\n\n`

    text += `> ✦ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${global.dev || 'ғᴇʀɴᴀɴᴅᴏ'}`

    await conn.sendMessage(m.chat, { 
        text,
        contextInfo: rcanal 
    }, { quoted: m })
}

handler.help = ['ping']
handler.tags = ['tools']
handler.command = ['ping', 'speed', 'p']

export default handler
