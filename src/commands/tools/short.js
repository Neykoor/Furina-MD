import axios from 'axios'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return conn.reply(m.chat, `🔗 *Acortador*\n\nUso: ${usedPrefix + command} <url>\nEjemplo: ${usedPrefix + command} https://google.com`, m)
    }
    
    try {
        await m.react('🕒')
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args[0])}`)
        conn.reply(m.chat, `🔗 *URL Acortada*\n\n📎 Original: ${args[0]}\n✂️ Corta: ${res.data}`, m)
        await m.react('✅')
    } catch {
        conn.reply(m.chat, `❌ *Error al acortar*`, m)
    }
}

handler.tags = ['tools']
handler.help = ['short']
handler.command = ['short', 'shorturl', 'acortar']


export default handler
