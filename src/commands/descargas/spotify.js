import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:* ${usedPrefix}${command} <URL de Spotify>\n\n📌 Ejemplo:\n${usedPrefix}${command} https://open.spotify.com/track/ABC123`
        }, { quoted: m })
    }

    const url = text.trim()
    const spotifyRegex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:track|album|playlist|episode)\//i
    if (!spotifyRegex.test(url)) {
        return conn.sendMessage(m.chat, { text: '❌ URL de Spotify no válida.' }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const { data } = await axios.get(`${API_BASE}/api/download/spotify`, {
            params: { url, apiKey: API_KEY },
            timeout: 60000
        })

        const dl = {
            title: data.title || data.result?.title || data.name || 'Spotify Track',
            artist: data.artist || data.result?.artist || data.artists || 'Desconocido',
            album: data.album || data.result?.album || 'Single',
            download: data.download || data.result?.download || data.url || data.audio || data.mp3,
            thumbnail: data.thumbnail || data.result?.thumbnail || data.image || data.cover,
            duration: data.duration || data.result?.duration || '0:00'
        }

        if (!dl.download) throw new Error('No se encontró enlace de descarga')

        await conn.sendMessage(m.chat, {
            audio: { url: dl.download },
            mimetype: 'audio/mpeg',
            fileName: `${dl.title} - ${dl.artist}.mp3`
        }, { quoted: m })

        await conn.sendMessage(m.chat, {
            text:
                `🎶 *Spotify Download*\n\n` +
                `📝 *Título:* ${dl.title}\n` +
                `🎤 *Artista:* ${dl.artist}\n` +
                `💿 *Álbum:* ${dl.album}\n` +
                `⏱️ *Duración:* ${dl.duration}`
        }, { quoted: m })

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['spotify', 'sp', 'spdl']
handler.tags = ['descargas']
handler.command = ['spotify', 'sp', 'spdl', 'spotifydl']
handler.register = false
handler.group = false

export default handler
