import fetch from "node-fetch"
import axios from "axios"
import { Jimp } from "jimp"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// =================== CONFIGURACIÓN API KAZUMA ===================
const API_BASE = "https://rest.kazuma.giize.com"
const API_KEY = "kzm-BJyESIjG-FONfiuYH"

const apiKazuma = {
    downloadSpotify: async (trackUrl) => {
        try {
            const url = `${API_BASE}/api/download/spotify?url=${encodeURIComponent(trackUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            return {
                status: true,
                title: data.title || data.result?.title || data.name || "Spotify Track",
                artist: data.artist || data.result?.artist || data.artists || data.author || "Desconocido",
                album: data.album || data.result?.album || "Single",
                download: data.download || data.result?.download || data.url || data.link || data.audio || data.mp3,
                thumbnail: data.thumbnail || data.result?.thumbnail || data.image || data.cover || data.album_art,
                duration: data.duration || data.result?.duration || "0:00",
                explicit: data.explicit || data.result?.explicit || false
            }
        } catch (e) {
            return { status: false, error: e.message }
        }
    }
}

async function resizeImage(buffer, size = 300) {
    try {
        const image = await Jimp.read(buffer)
        return await image.resize({ w: size, h: size }).getBuffer("image/jpeg")
    } catch {
        return buffer
    }
}

async function downloadMedia(mediaUrl, filePath) {
    try {
        const response = await axios({
            url: mediaUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        const writer = fs.createWriteStream(filePath)
        response.data.pipe(writer)

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath))
            writer.on('error', reject)
        })
    } catch (e) {
        throw new Error(`Error descargando medio: ${e.message}`)
    }
}

function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return 'Desconocido'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0; bytes = Number(bytes)
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
    return `${bytes.toFixed(2)} ${units[i]}`
}

async function getSize(url) {
    try {
        const res = await axios.head(url, { timeout: 10000 })
        return parseInt(res.headers['content-length'], 10) || 0
    } catch { return 0 }
}

// =================== INFO CANAL ===================
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

// =================== HANDLER PRINCIPAL ===================
const handler = async (m, { conn, text, usedPrefix, command }) => {

    // ─── SIN TEXTO: MOSTRAR AYUDA ───
    if (!text?.trim()) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `> . ﹡ ﹟ 🎶 ׄ ⬭ *sᴘᴏᴛɪғʏ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎶* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <URL de Spotify>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} https://open.spotify.com/track/ABC123\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *sᴏᴘᴏʀᴛᴇ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Canciones (tracks)\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Álbumes (albums)\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Playlists (playlists)`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // ─── VALIDAR URL DE SPOTIFY ───
    const spotifyRegex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(?:track|album|playlist|episode)\/([a-zA-Z0-9]+)/i
    if (!spotifyRegex.test(text.trim())) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❌ *ᴜʀʟ ɪɴᴠᴀ́ʟɪᴅᴀ*\n\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀ ᴜɴᴀ ᴜʀʟ ᴠᴀ́ʟɪᴅᴀ ᴅᴇ sᴘᴏᴛɪғʏ.\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: https://open.spotify.com/track/ABC123`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const trackUrl = text.trim()
        const dl = await apiKazuma.downloadSpotify(trackUrl)

        if (!dl.status) throw dl.error || '❌ ɴᴏ sᴇ ᴘᴜᴅᴏ ᴅᴇsᴄᴀʀɢᴀʀ'

        const rcanal = await getRcanal()

        // Preparar thumbnail
        let thumbBuffer = null
        try {
            if (dl.thumbnail) {
                thumbBuffer = await (await fetch(dl.thumbnail)).buffer()
                thumbBuffer = await resizeImage(thumbBuffer, 300)
            }
        } catch {}

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `🎶「 ${dl.title?.substring(0, 40) || 'Spotify'} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbBuffer || Buffer.alloc(0)
                }
            }
        }

        // Mensaje de procesamiento
        const processingMsg =
            `> . ﹡ ﹟ ⏳ ׄ ⬭ *sᴘᴏᴛɪғʏ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎶* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${dl.title?.substring(0, 80) || 'Sin título'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴀʀᴛɪsᴛᴀ* :: ${dl.artist?.substring(0, 40) || 'Desconocido'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴀ́ʟʙᴜᴍ* :: ${dl.album?.substring(0, 40) || 'Single'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴅᴜʀᴀᴄɪᴏ́ɴ* :: ${dl.duration}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴘʀᴏᴄᴇsᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        // Crear carpeta temporal si no existe
        const tempDir = path.join(__dirname, '..', 'tmp', 'spotify')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }

        const safeName = `spotify_${Date.now()}.mp3`
        const filePath = path.join(tempDir, safeName)
        await downloadMedia(dl.download, filePath)

        const size = await getSize(dl.download)
        const sizeFormatted = formatSize(size)

        // Enviar como audio con metadatos
        await conn.sendMessage(m.chat, {
            audio: { url: filePath },
            mimetype: 'audio/mpeg',
            fileName: `${dl.title} - ${dl.artist}.mp3`,
            ptt: false
        }, { quoted: fkontak })

        // Enviar info adicional como documento si es muy grande o si el usuario quiere
        if (size > 20 * 1024 * 1024) {
            await conn.sendMessage(m.chat, {
                document: { url: filePath },
                mimetype: 'audio/mpeg',
                fileName: `${dl.title} - ${dl.artist}.mp3`,
                jpegThumbnail: thumbBuffer,
                caption: `🎶 *${dl.title}*\n🎤 ${dl.artist}\n💿 ${dl.album}\n⏱️ ${dl.duration}\n📦 ${sizeFormatted}${dl.explicit ? '\n🔞 Explicit' : ''}`
            }, { quoted: m })
        } else {
            // Info como mensaje de texto
            await conn.sendMessage(m.chat, {
                text: `> . ﹡ ﹟ ✅ ׄ ⬭ *sᴘᴏᴛɪғʏ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ*\n\n` +
                      `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎶* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                      `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${dl.title}\n` +
                      `ׅㅤ𓏸𓈒ㅤׄ *ᴀʀᴛɪsᴛᴀ* :: ${dl.artist}\n` +
                      `ׅㅤ𓏸𓈒ㅤׄ *ᴀ́ʟʙᴜᴍ* :: ${dl.album}\n` +
                      `ׅㅤ𓏸𓈒ㅤׄ *ᴅᴜʀᴀᴄɪᴏ́ɴ* :: ${dl.duration}\n` +
                      `ׅㅤ𓏸𓈒ㅤׄ *ᴛᴀᴍᴀɴ̃ᴏ* :: ${sizeFormatted}${dl.explicit ? '\n🔞 Explicit' : ''}`,
                contextInfo: rcanal
            }, { quoted: m })
        }

        // Limpiar archivo temporal
        setTimeout(() => {
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {}
        }, 30000)

        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['spotify', 'sp', 'spdl']
handler.tags = ['descargas']
handler.command = ['spotify', 'sp', 'spdl', 'spotifydl', 'spotidownload']
handler.register = false
handler.group = false
handler.reg = true

export default handler
