import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

async function searchTikTok(query) {
    const { data } = await axios.get(`${API_BASE}/api/search/tiktok`, {
        params: { query, apiKey: API_KEY },
        timeout: 15000
    })
    const results = data.results || data.data || data.videos || (Array.isArray(data) ? data : [data])
    return results.map(v => ({
        title: v.title || v.desc || v.description || 'TikTok',
        url: v.url || v.link || v.video_url || `https://tiktok.com/@${v.author?.uniqueId || 'user'}/video/${v.videoId || v.id}`,
        author: v.author?.nickname || v.author || 'TikTok User',
        thumbnail: v.thumbnail || v.cover || v.image
    })).filter(v => v.url)
}

async function downloadTikTok(url) {
    const { data } = await axios.get(`${API_BASE}/api/download/tiktok`, {
        params: { url, apiKey: API_KEY },
        timeout: 60000
    })
    return {
        title: data.title || data.result?.title || data.desc || 'TikTok',
        download: data.download || data.result?.download || data.video || data.url || data.no_watermark || data.nowm,
        thumbnail: data.thumbnail || data.result?.thumbnail || data.cover,
        author: data.author || data.result?.author || data.creator || 'TikTok User',
        audio: data.audio || data.result?.audio || data.music || data.mp3 || null
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // ── Descarga directa por URL ──
    const ttRegex = /(?:https?:\/\/)?(?:www\.|vm\.)?(?:tiktok\.com|vt\.tiktok\.com)\//i
    if (text?.trim() && ttRegex.test(text.trim())) {
        await m.react('⏳')

        try {
            const dl = await downloadTikTok(text.trim())

            await conn.sendMessage(m.chat, {
                video: { url: dl.download },
                caption: `🎵 *TikTok*\n📝 ${dl.title.substring(0, 60)}\n👤 ${dl.author}`
            }, { quoted: m })

            await m.react('✅')
        } catch (err) {
            await m.react('❌')
            conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
        }
        return
    }

    // ── Búsqueda ──
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:*\n` +
                  `• ${usedPrefix}${command} <URL de TikTok> — Descargar video\n` +
                  `• ${usedPrefix}tiktoksearch <término> — Buscar videos\n\n` +
                  `📌 Ejemplo:\n${usedPrefix}${command} https://vm.tiktok.com/ABC123/`
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        const results = await searchTikTok(text.trim())
        if (!results.length) throw new Error('No se encontraron resultados')

        const video = results[0]

        await conn.sendMessage(m.chat, {
            image: { url: video.thumbnail },
            caption:
                `🎵 *TikTok Search*\n\n` +
                `📝 *Título:* ${video.title.substring(0, 80)}\n` +
                `👤 *Autor:* ${video.author}\n` +
                `🔗 *Link:* ${video.url}\n\n` +
                `📥 *Descargando...*`
        }, { quoted: m })

        await m.react('⏳')

        const dl = await downloadTikTok(video.url)

        await conn.sendMessage(m.chat, {
            video: { url: dl.download },
            caption: `🎵 ${dl.title.substring(0, 60)}\n👤 ${dl.author}`
        }, { quoted: m })

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['tiktok', 'tt', 'tiktoksearch']
handler.tags = ['descargas', 'busqueda']
handler.command = ['tiktok', 'tt', 'ttdl', 'tiktokdl', 'tiktoksearch', 'ttsearch']
handler.register = false
handler.group = false

export default handler
