import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

async function searchYouTube(query) {
    const { data } = await axios.get(`${API_BASE}/api/search/youtube`, {
        params: { q: query, apiKey: API_KEY },
        timeout: 15000
    })
    const results = data.results || data.data || (Array.isArray(data) ? data : [data])
    return results.map(v => ({
        title: v.title || 'Sin título',
        url: v.url || v.link || `https://youtube.com/watch?v=${v.videoId || v.id}`,
        thumbnail: v.thumbnail || v.image || `https://i.ytimg.com/vi/${v.videoId || v.id}/hqdefault.jpg`,
        duration: v.duration || v.timestamp || '0:00',
        author: v.author || v.channel || 'Desconocido'
    })).filter(v => v.url)
}

async function downloadYouTube(url, type = 'audio') {
    const endpoint = type === 'audio' ? 'ytaudio' : 'ytvideo'
    const { data } = await axios.get(`${API_BASE}/api/download/${endpoint}`, {
        params: { url, apiKey: API_KEY },
        timeout: 60000
    })
    return {
        title: data.title || data.result?.title || 'YouTube',
        download: data.download || data.result?.download || data.url || data.link,
        thumbnail: data.thumbnail || data.result?.thumbnail
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // ── Comandos directos ytmp3 / ytmp4 ──
    if (['ytmp3', 'ytmp4'].includes(command)) {
        if (!text?.trim()) {
            return conn.sendMessage(m.chat, {
                text: `✳️ *Uso:* ${usedPrefix}${command} <URL de YouTube>`
            }, { quoted: m })
        }

        await m.react('⏳')

        try {
            const type = command === 'ytmp3' ? 'audio' : 'video'
            const dl = await downloadYouTube(text.trim(), type)

            if (type === 'audio') {
                await conn.sendMessage(m.chat, {
                    audio: { url: dl.download },
                    mimetype: 'audio/mpeg',
                    fileName: `${dl.title}.mp3`
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, {
                    video: { url: dl.download },
                    caption: `🎬 ${dl.title}`
                }, { quoted: m })
            }

            await m.react('✅')
        } catch (err) {
            await m.react('❌')
            conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
        }
        return
    }

    // ── Comando play (búsqueda) ──
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:* ${usedPrefix}${command} <canción o video>\n\n📌 Ejemplo:\n${usedPrefix}${command} Bad Bunny Tití Me Preguntó\n\n🎵 También puedes usar:\n• ${usedPrefix}ytmp3 <URL>\n• ${usedPrefix}ytmp4 <URL>`
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        const results = await searchYouTube(text.trim())
        if (!results.length) throw new Error('No se encontraron resultados')

        const video = results[0]
        const caption =
            `🎬 *YouTube Play*\n\n` +
            `📝 *Título:* ${video.title.substring(0, 80)}\n` +
            `👤 *Canal:* ${video.author}\n` +
            `⏱️ *Duración:* ${video.duration}\n` +
            `🔗 *Link:* ${video.url}\n\n` +
            `📥 *Descargando audio...*`

        await conn.sendMessage(m.chat, {
            image: { url: video.thumbnail },
            caption
        }, { quoted: m })

        await m.react('⏳')

        const dl = await downloadYouTube(video.url, 'audio')

        await conn.sendMessage(m.chat, {
            audio: { url: dl.download },
            mimetype: 'audio/mpeg',
            fileName: `${dl.title}.mp3`
        }, { quoted: m })

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['play', 'ytmp3', 'ytmp4']
handler.tags = ['descargas']
handler.command = ['play', 'ytmp3', 'ytmp4']
handler.register = false
handler.group = false

export default handler
