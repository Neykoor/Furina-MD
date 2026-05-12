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
    searchPinterest: async (query) => {
        try {
            const url = `${API_BASE}/api/search/pinterest?apiKey=${API_KEY}&query=${encodeURIComponent(query)}`
            const res = await axios.get(url, { timeout: 15000 })
            const data = res.data

            // Soporte flexible según estructura de respuesta
            const results = data.results || data.data || data.result || data.images || (Array.isArray(data) ? data : [data])
            if (!results || !results.length) throw new Error("Sin resultados")

            return results.map(v => ({
                title: v.title || v.alt || v.description || query,
                url: v.url || v.image || v.src || v.link || v.image_url,
                thumbnail: v.thumbnail || v.preview || v.url || v.image || v.src,
                source: v.source || v.pinner || v.board || "Pinterest"
            })).filter(v => v.url)
        } catch (e) {
            throw new Error(`Error de búsqueda: ${e.message}`)
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

async function downloadImage(imageUrl, filePath) {
    try {
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
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
        throw new Error(`Error descargando imagen: ${e.message}`)
    }
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
            text: `> . ﹡ ﹟ 📌 ׄ ⬭ *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <término de búsqueda>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} anime aesthetic\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴅᴇᴛᴀʟʟᴇs*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Búsqueda en Pinterest\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Envía múltiples imágenes\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ • Máximo 10 resultados`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        const searchResults = await apiKazuma.searchPinterest(text)

        if (!searchResults.length) throw '❗ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ɪᴍᴀ́ɢᴇɴᴇs'

        const rcanal = await getRcanal()
        const totalImages = Math.min(searchResults.length, 10)

        // Mensaje de procesamiento
        const processingMsg =
            `> . ﹡ ﹟ 📌 ׄ ⬭ *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʙᴜ́sǫᴜᴇᴅᴀ* :: ${text.substring(0, 50)}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʀᴇsᴜʟᴛᴀᴅᴏs* :: ${totalImages} ɪᴍᴀ́ɢᴇɴᴇs\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴅᴇsᴄᴀʀɢᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        // Crear carpeta temporal si no existe
        const tempDir = path.join(__dirname, '..', 'tmp', 'pinterest')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }

        const downloadedFiles = []
        const failedDownloads = []

        // Descargar imágenes
        for (let i = 0; i < totalImages; i++) {
            const img = searchResults[i]
            const ext = path.extname(new URL(img.url, 'https://pinterest.com').pathname) || '.jpg'
            const safeName = `pinterest_${Date.now()}_${i}${ext}`
            const filePath = path.join(tempDir, safeName)

            try {
                await downloadImage(img.url, filePath)
                downloadedFiles.push({
                    path: filePath,
                    title: img.title,
                    source: img.source,
                    originalUrl: img.url
                })
            } catch (e) {
                failedDownloads.push(img.url)
            }
        }

        if (!downloadedFiles.length) throw '❌ ɴᴏ sᴇ ᴘᴜᴅɪᴇʀᴏɴ ᴅᴇsᴄᴀʀɢᴀʀ ʟᴀs ɪᴍᴀ́ɢᴇɴᴇs'

        // Enviar imágenes como archivo (document/image)
        for (let i = 0; i < downloadedFiles.length; i++) {
            const file = downloadedFiles[i]

            try {
                // Leer archivo
                const fileBuffer = fs.readFileSync(file.path)

                // Crear thumbnail
                let thumbBuffer = fileBuffer
                try {
                    thumbBuffer = await resizeImage(fileBuffer, 300)
                } catch {}

                // Enviar como imagen con caption
                await conn.sendMessage(m.chat, {
                    image: fileBuffer,
                    caption: `📌 *${file.title?.substring(0, 60) || 'Pinterest Image'}*\n📎 ${i + 1}/${downloadedFiles.length}\n🔗 Fuente: ${file.source}`,
                    jpegThumbnail: thumbBuffer,
                    contextInfo: rcanal
                }, { quoted: i === 0 ? m : undefined })

                // Pequeña pausa entre envíos para evitar rate limits
                if (i < downloadedFiles.length - 1) {
                    await new Promise(r => setTimeout(r, 800))
                }

            } catch (e) {
                console.error(`Error enviando imagen ${i}:`, e.message)
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
            `> . ﹡ ﹟ ✅ ׄ ⬭ *ᴘɪɴᴛᴇʀᴇsᴛ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📷* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇɴᴠɪᴀᴅᴀs* :: ${downloadedFiles.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ғᴀʟʟɪᴅᴀs* :: ${failedDownloads.length}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʙᴜ́sǫᴜᴇᴅᴀ* :: ${text.substring(0, 40)}`

        await conn.sendMessage(m.chat, { text: finalMsg, contextInfo: rcanal }, { quoted: m })
        await m.react('✅')

    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['pinterest', 'pin']
handler.tags = ['descargas', 'busqueda']
handler.command = ['pinterest', 'pin', 'pinterestsearch']
handler.register = false
handler.group = false
handler.reg = true

export default handler
