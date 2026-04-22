let handler = async (m, { conn }) => {
    // Medir latencia real del bot
    const start = Date.now()
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    const ping = Date.now() - start

    // Uptime formateado
    const uptime = process.uptime()
    const d = Math.floor(uptime / 86400)
    const h = Math.floor((uptime % 86400) / 3600)
    const min = Math.floor((uptime % 3600) / 60)
    const s = Math.floor(uptime % 60)
    const uptimeStr = [d && `${d}d`, h && `${h}h`, min && `${min}m`, `${s}s`].filter(Boolean).join(' ')

    // RAM
    const mem = process.memoryUsage()
    const ram = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const ramTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)

    // Datos del bot
    const botName = global.namebot || 'Asta Bot'
    const dev     = global.dev     || 'Fernando'
    const version = global.vs      || '1.0.0'
    const prefix  = global.prefix  || '.'
    const subBots = global.subBots?.size || 0
    const botNum  = conn.user?.id?.split(':')[0] || conn.user?.jid?.split('@')[0] || '?'

    // Emoji según velocidad
    const pingEmoji = ping < 500 ? '🟢' : ping < 1500 ? '🟡' : '🔴'

    const text =
`╭━━━━━━━━━━━━━━━━━━╮
│  🏓 *PING — ${botName}*
╰━━━━━━━━━━━━━━━━━━╯

📶 *Latencia*
 ${pingEmoji} Bot · *${ping} ms*

⚙️ *Sistema*
 ⏱️ Uptime · *${uptimeStr}*
 💾 RAM · *${ram} / ${ramTotal} MB*

🤖 *Bot*
 📛 Nombre · *${botName}*
 📱 Número · *${botNum}*
 🏷️ Versión · *v${version}*
 🔑 Prefijo · *${prefix}*
 🔗 Sub-bots · *${subBots}*

> ✦ Powered by ${dev}`

    await conn.sendMessage(m.chat, { text }, { quoted: m })
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

handler.help = ['ping']
handler.tags = ['general']
handler.command = ['ping', 'speed', 'p']

export default handler
