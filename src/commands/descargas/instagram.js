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
    downloadInstagram: async (postUrl) => {
        try {
            const url = `${API_BASE}/api/download/instagram?url=${encodeURIComponent(postUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            // Soporte flexible según estructura de respuesta
            const results = data.results || data.data || data.result || data.medias || data.media || (Array.isArray(data) ? data : [data])
            if (!results || !results.length) {
                // Si es un solo objeto sin array
                if (data.url || data.download || data.video || data.image) {
                    return [{
                        type: data.type || (data.video ? 'video' : 'image'),
                        url: data.url || data.download || data.video || data.image || data.src,
                        thumbnail: data.thumbnail || data.cover || data.preview,
                        title: data.title || data.caption || "Instagram Post"
                    }]
                }
                throw new Error("Sin resultados")
            }

            return results.map(v => ({
                type: v.type || (v.video ? 'video' : 'image'),
                url: v.url || v.download || v.video || v.image || v.src || v.link,
                thumbnail: v.thumbnail || v.cover || v.preview || v.image,
                title: v.title || v.caption || "Instagram Post"
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
            text: `> . ﹡ ﹟ 📸 ׄ ⬭ *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <URL de Instagram>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} https://www.instagram.com/p/ABC123/\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *sᴏᴘᴏʀᴛᴇ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Posts (fotos/videos)\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Reels\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Carousels (múltiples medios)\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Stories (si la API lo permite)`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // ─── VALIDAR URL DE INSTAGRAM ───
    const igRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv|stories)\/([^\/?#&]+)/i
    if (!igRegex.test(text.trim())) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❌ *ᴜʀʟ ɪɴᴠᴀ́ʟɪᴅᴀ*\n\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ ᴘᴏʀ ғᴀᴠᴏʀ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀ ᴜɴᴀ ᴜʀʟ ᴠᴀ́ʟɪᴅᴀ ᴅᴇ ɪɴsᴛᴀɢʀᴀᴍ.\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: https://www.instagram.com/p/ABC123/`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const postUrl = text.trim()
        const results = await apiKazuma.downloadInstagram(postUrl)

        if (!results.length) throw '❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴏ́ ᴄᴏɴᴛᴇɴɪᴅᴏ'

        const rcanal = await getRcanal()
        const totalMedios = results.length

        // Mensaje de procesamiento
        const processingMsg =
            `> . ﹡ ﹟ 📸 ׄ ⬭ *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴜʀʟ* :: ${postUrl.substring(0, 60)}...\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴍᴇᴅɪᴏs* :: ${totalMedios} ᴀʀᴄʜɪᴠᴏ(s)\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴘʀᴏᴄᴇsᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        // Crear carpeta temporal si no existe
        const tempDir = path.join(__dirname, '..', 'tmp', 'instagram')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }

        const downloadedFiles = []
        const failedDownloads = []

        // Descargar cada medio
        for (let i = 0; i < totalMedios; i++) {
            const media = results[i]
            const isVideo = media.type === 'video' || media.url.match(/\.(mp4|mov|avi)/i)
            const ext = isVideo ? '.mp4' : '.jpg'
            const safeName = `ig_${Date.now()}_${i}${ext}`
            const filePath = path.join(tempDir, safeName)

            try {
                await downloadMedia(media.url, filePath)
                downloadedFiles.push({
                    path: filePath,
                    type: isVideo ? 'video' : 'image',
                    title: media.title,
                    originalUrl: media.url
                })
            } catch (e) {
                failedDownloads.push(media.url)
            }
        }

        if (!downloadedFiles.length) throw '❌ ɴᴏ sᴇ ᴘᴜᴅɪᴇʀᴏɴ ᴅᴇsᴄᴀʀɢᴀʀ ʟᴏs ᴍᴇᴅɪᴏs'

        // Preparar thumbnail para mensajes
        let thumbBuffer = null
        try {
            if (results[0].thumbnail) {
                thumbBuffer = await (await fetch(results[0].thumbnail)).buffer()
                thumbBuffer = await resizeImage(thumbBuffer, 300)
            }
        } catch {}

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `📸「 Instagram 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbBuffer || Buffer.alloc(0)
                }
            }
        }

        // Enviar medios
        for (let i = 0; i < downloadedFiles.length; i++) {
            const file = downloadedFiles[i]

            try {
                if (file.type === 'video') {
                    // Verificar tamaño para videos
                    const size = await getSize(file.originalUrl)

                    if (size > 200 * 1024 * 1024) {
                        // Enviar como documento si es muy grande
                        await conn.sendMessage(m.chat, {
                            document: { url: file.path },
                            mimetype: 'video/mp4',
                            fileName: `instagram_video_${i + 1}.mp4`,
                            jpegThumbnail: thumbBuffer,
                            caption: `📽️ *Video ${i + 1}/${downloadedFiles.length}*\n📦 ${formatSize(size)}`
                        }, { quoted: i === 0 ? fkontak : undefined })
                    } else {
                        await conn.sendMessage(m.chat, {
                            video: { url: file.path },
                            mimetype: 'video/mp4',
                            caption: `📽️ *Video ${i + 1}/${downloadedFiles.length}*`,
                            jpegThumbnail: thumbBuffer
                        }, { quoted: i === 0 ? fkontak : undefined })
                    }
                } else {
                    // Imagen
                    const imgBuffer = fs.readFileSync(file.path)
                    await conn.sendMessage(m.chat, {
                        image: imgBuffer,
                        caption: `📷 *Imagen ${i + 1}/${downloadedFiles.length}*`,
                        jpegThumbnail: thumbBuffer
                    }, { quoted: i === 0 ? fkontak : undefined })
                }

                // Pausa entre envíos
                if (i < downloadedFiles.length - 1) {
                    await new Promise(r => setTimeout(r, 1000))
                }

            } catch (e) {
                console.error(`Error enviando medio ${i}:`, e.message)
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
            `> . ﹡ ﹟ ✅ ׄ ⬭ *ɪɴsᴛᴀɢʀᴀᴍ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇɴᴠɪᴀᴅᴏs* :: ${downloadedFiles.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ғᴀʟʟɪᴅᴏs* :: ${failedDownloads.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪᴘᴏ* :: ${totalMedios > 1 ? 'Carousel' : results[0].type === 'video' ? 'Reel/Video' : 'Post'}`

        await conn.sendMessage(m.chat, { text: finalMsg, contextInfo: rcanal }, { quoted: m })
        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['instagram', 'ig', 'igdl']
handler.tags = ['descargas']
handler.command = ['instagram', 'ig', 'igdl', 'instadl', 'igdownload']
handler.register = false
handler.group = false
handler.reg = true

export default handler
