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
    downloadFacebook: async (postUrl) => {
        try {
            const url = `${API_BASE}/api/download/facebook?url=${encodeURIComponent(postUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            // Soporte flexible según estructura de respuesta
            const results = data.results || data.data || data.result || data.medias || data.media || (Array.isArray(data) ? data : [data])

            if (!results || !results.length) {
                // Si es un solo objeto sin array
                if (data.url || data.download || data.video || data.hd || data.sd) {
                    return [{
                        quality: data.quality || (data.hd ? 'HD' : 'SD'),
                        url: data.url || data.download || data.video || data.hd || data.sd,
                        thumbnail: data.thumbnail || data.cover || data.preview || data.image,
                        title: data.title || data.caption || "Facebook Video",
                        duration: data.duration || "0:00"
                    }]
                }
                throw new Error("Sin resultados")
            }

            return results.map(v => ({
                quality: v.quality || (v.hd ? 'HD' : v.sd ? 'SD' : 'Normal'),
                url: v.url || v.download || v.video || v.hd || v.sd || v.link,
                thumbnail: v.thumbnail || v.cover || v.preview || v.image,
                title: v.title || v.caption || "Facebook Video",
                duration: v.duration || "0:00"
            })).filter(v => v.url)
        } catch (e) {
            throw new Error(`Error de descarga: ${e.message}`)
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
            text: `> . ﹡ ﹟ 📘 ׄ ⬭ *ғᴀᴄᴇʙᴏᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📘* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <URL de Facebook>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} https://www.facebook.com/share/v/ABC123/\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *sᴏᴘᴏʀᴛᴇ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Videos públicos\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Reels\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Watch\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Publicaciones con video`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // ─── VALIDAR URL DE FACEBOOK ───
    const fbRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch|fb\.me)\/(?:share\/v\/|share\/r\/|watch\/|reel\/|video\/|videos\/|[^\/]+\/videos\/|[^\/]+\/posts\/|[^\/?#&]+)/i
    if (!fbRegex.test(text.trim())) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❌ *ᴜʀʟ ɪɴᴠᴀ́ʟɪᴅᴀ*\n\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ ᴘᴏʀ ғᴀᴠᴏʀ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀ ᴜɴᴀ ᴜʀʟ ᴠᴀ́ʟɪᴅᴀ ᴅᴇ ғᴀᴄᴇʙᴏᴏᴋ.\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: https://www.facebook.com/share/v/ABC123/`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const postUrl = text.trim()
        const results = await apiKazuma.downloadFacebook(postUrl)

        if (!results.length) throw '❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴏ́ ᴄᴏɴᴛᴇɴɪᴅᴏ'

        const rcanal = await getRcanal()
        const totalMedios = results.length
        const mainResult = results[0]

        // Preparar thumbnail
        let thumbBuffer = null
        try {
            if (mainResult.thumbnail) {
                thumbBuffer = await (await fetch(mainResult.thumbnail)).buffer()
                thumbBuffer = await resizeImage(thumbBuffer, 300)
            }
        } catch {}

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `📘「 ${mainResult.title?.substring(0, 40) || 'Facebook'} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbBuffer || Buffer.alloc(0)
                }
            }
        }

        // Mensaje de procesamiento
        const processingMsg =
            `> . ﹡ ﹟ 📘 ׄ ⬭ *ғᴀᴄᴇʙᴏᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📘* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${mainResult.title?.substring(0, 80) || 'Sin título'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴄᴀʟɪᴅᴀᴅ* :: ${mainResult.quality || 'Normal'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴅᴜʀᴀᴄɪᴏ́ɴ* :: ${mainResult.duration || 'Desconocida'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴍᴇᴅɪᴏs* :: ${totalMedios}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴘʀᴏᴄᴇsᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        // Crear carpeta temporal si no existe
        const tempDir = path.join(__dirname, '..', 'tmp', 'facebook')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }

        const downloadedFiles = []
        const failedDownloads = []

        // Descargar cada medio
        for (let i = 0; i < totalMedios; i++) {
            const media = results[i]
            const ext = '.mp4'
            const safeName = `fb_${Date.now()}_${i}${ext}`
            const filePath = path.join(tempDir, safeName)

            try {
                await downloadMedia(media.url, filePath)
                downloadedFiles.push({
                    path: filePath,
                    quality: media.quality,
                    title: media.title,
                    originalUrl: media.url
                })
            } catch (e) {
                failedDownloads.push(media.url)
            }
        }

        if (!downloadedFiles.length) throw '❌ ɴᴏ sᴇ ᴘᴜᴅɪᴇʀᴏɴ ᴅᴇsᴄᴀʀɢᴀʀ ʟᴏs ᴠɪᴅᴇᴏs'

        // Enviar videos
        for (let i = 0; i < downloadedFiles.length; i++) {
            const file = downloadedFiles[i]

            try {
                const size = await getSize(file.originalUrl)

                if (size > 200 * 1024 * 1024) {
                    // Enviar como documento si es muy grande
                    await conn.sendMessage(m.chat, {
                        document: { url: file.path },
                        mimetype: 'video/mp4',
                        fileName: `facebook_${file.quality || 'video'}_${i + 1}.mp4`,
                        jpegThumbnail: thumbBuffer,
                        caption: `📘 *${file.title?.substring(0, 60) || 'Facebook Video'}*\n📽️ ${file.quality || 'Normal'}\n📦 ${formatSize(size)}\n📎 ${i + 1}/${downloadedFiles.length}`
                    }, { quoted: i === 0 ? fkontak : undefined })
                } else {
                    await conn.sendMessage(m.chat, {
                        video: { url: file.path },
                        mimetype: 'video/mp4',
                        caption: `📘 *${file.title?.substring(0, 60) || 'Facebook Video'}*\n📽️ ${file.quality || 'Normal'}\n📎 ${i + 1}/${downloadedFiles.length}`,
                        jpegThumbnail: thumbBuffer
                    }, { quoted: i === 0 ? fkontak : undefined })
                }

                // Pausa entre envíos
                if (i < downloadedFiles.length - 1) {
                    await new Promise(r => setTimeout(r, 1000))
                }

            } catch (e) {
                console.error(`Error enviando video ${i}:`, e.message)
            }
        }

        // Limpiar archivos temporales
        setTimeout(() => {
            downloadedFiles.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
                } catch {}
            })
        }, 30000)

        // Mensaje final
        const finalMsg =
            `> . ﹡ ﹟ ✅ ׄ ⬭ *ғᴀᴄᴇʙᴏᴏᴋ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📘* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇɴᴠɪᴀᴅᴏs* :: ${downloadedFiles.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ғᴀʟʟɪᴅᴏs* :: ${failedDownloads.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴄᴀʟɪᴅᴀᴅ* :: ${mainResult.quality || 'Normal'}`

        await conn.sendMessage(m.chat, { text: finalMsg, contextInfo: rcanal }, { quoted: m })
        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['facebook', 'fb', 'fbdl']
handler.tags = ['descargas']
handler.command = ['facebook', 'fb', 'fbdl', 'fbdownload', 'facebookdl']
handler.register = false
handler.group = false
handler.reg = true

export default handler
