import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:* ${usedPrefix}${command} <URL de Instagram>\n\n📌 Ejemplo:\n${usedPrefix}${command} https://www.instagram.com/p/ABC123/`
        }, { quoted: m })
    }

    const url = text.trim()
    const igRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\//i
    if (!igRegex.test(url)) {
        return conn.sendMessage(m.chat, { text: '❌ URL de Instagram no válida.' }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const { data } = await axios.get(`${API_BASE}/api/download/instagram`, {
            params: { url, apiKey: API_KEY },
            timeout: 60000
        })

        const results = data.results || data.data || data.result || data.medias || (Array.isArray(data) ? data : [data])
        if (!results?.length) throw new Error('No se encontró contenido')

        const medias = results
            .map(v => ({
                url: v.url || v.download || v.video || v.image || v.src || v.link,
                type: v.type || (v.video ? 'video' : 'image')
            }))
            .filter(v => v.url)

        if (!medias.length) throw new Error('No se encontraron medios para descargar')

        await m.react('⬆️')

        for (let i = 0; i < medias.length; i++) {
            const media = medias[i]
            const caption = `📸 Instagram\n📎 ${i + 1}/${medias.length}`

            if (media.type === 'video') {
                await conn.sendMessage(m.chat, {
                    video: { url: media.url },
                    caption
                }, { quoted: i === 0 ? m : undefined })
            } else {
                await conn.sendMessage(m.chat, {
                    image: { url: media.url },
                    caption
                }, { quoted: i === 0 ? m : undefined })
            }

            if (i < medias.length - 1) await new Promise(r => setTimeout(r, 1000))
        }

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['instagram', 'ig', 'igdl']
handler.tags = ['descargas']
handler.command = ['instagram', 'ig', 'igdl', 'instadl']
handler.register = false
handler.group = false

export default handler
