import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:* ${usedPrefix}${command} <URL de Facebook>\n\n📌 Ejemplo:\n${usedPrefix}${command} https://www.facebook.com/share/v/ABC123/`
        }, { quoted: m })
    }

    const url = text.trim()
    const fbRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch|fb\.me)\//i
    if (!fbRegex.test(url)) {
        return conn.sendMessage(m.chat, { text: '❌ URL de Facebook no válida.' }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const { data } = await axios.get(`${API_BASE}/api/download/facebook`, {
            params: { url, apiKey: API_KEY },
            timeout: 60000
        })

        const results = data.results || data.data || data.result || data.medias || (Array.isArray(data) ? data : [data])
        const media = results.find(r => r.url || r.download || r.video || r.hd || r.sd) || data

        const downloadUrl = media.url || media.download || media.video || media.hd || media.sd
        if (!downloadUrl) throw new Error('No se encontró enlace de descarga')

        const title = media.title || media.caption || 'Facebook Video'
        const quality = media.quality || (media.hd ? 'HD' : 'SD')

        await conn.sendMessage(m.chat, {
            video: { url: downloadUrl },
            caption: `📘 *Facebook*\n📝 ${title.substring(0, 60)}\n📽️ Calidad: ${quality}`
        }, { quoted: m })

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['facebook', 'fb', 'fbdl']
handler.tags = ['descargas']
handler.command = ['facebook', 'fb', 'fbdl']
handler.register = false
handler.group = false

export default handler
