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
    searchTikTok: async (query) => {
        try {
            const url = `${API_BASE}/api/search/tiktok?apiKey=${API_KEY}&query=${encodeURIComponent(query)}`
            const res = await axios.get(url, { timeout: 15000 })
            const data = res.data

            const results = data.results || data.data || data.result || data.videos || (Array.isArray(data) ? data : [data])
            if (!results || !results.length) throw new Error("Sin resultados")

            return results.map(v => ({
                title: v.title || v.desc || v.description || v.text || "TikTok Video",
                url: v.url || v.link || v.video_url || v.play || `https://www.tiktok.com/@${v.author?.uniqueId || 'user'}/video/${v.videoId || v.id}`,
                thumbnail: v.thumbnail || v.cover || v.image || v.avatar || v.dynamicCover,
                author: v.author?.nickname || v.author || v.creator || "TikTok User",
                authorUser: v.author?.uniqueId || v.author_username || v.username || "user",
                views: v.stats?.playCount || v.views || v.playCount || v.stats?.views || "0",
                likes: v.stats?.diggCount || v.likes || v.stats?.likes || "0",
                duration: v.duration || v.video?.duration || "0",
                videoId: v.videoId || v.id || null
            })).filter(v => v.url)
        } catch (e) {
            throw new Error(`Error de búsqueda: ${e.message}`)
        }
    },

    downloadTikTok: async (videoUrl) => {
        try {
            const url = `${API_BASE}/api/download/tiktok?url=${encodeURIComponent(videoUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            return {
                status: true,
                title: data.title || data.result?.title || data.desc || data.description || "TikTok Video",
                download: data.download || data.result?.download || data.video || data.url || data.play || data.no_watermark || data.nowm,
                thumbnail: data.thumbnail || data.result?.thumbnail || data.cover || data.image,
                author: data.author || data.result?.author || data.creator || data.nickname || "TikTok User",
                audio: data.audio || data.result?.audio || data.music || data.mp3 || null,
                duration: data.duration || data.result?.duration || "0",
                views: data.views || data.result?.views || data.stats?.playCount || "0",
                likes: data.likes || data.result?.likes || data.stats?.diggCount || "0"
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

function formatNumber(num) {
    if (!num) return '0'
    const n = Number(num)
    if (isNaN(n)) return num
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
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

    // ─── COMANDOS DIRECTOS (tiktok con URL) ───
    if (['tiktok', 'tt', 'ttdl', 'tiktokdl'].includes(command)) {
        return await handleDirectDownload(m, conn, text, command, usedPrefix)
    }

    // ─── SIN TEXTO: MOSTRAR AYUDA ───
    if (!text?.trim()) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `> . ﹡ ﹟ 🎵 ׄ ⬭ *ᴛɪᴋᴛᴏᴋ ᴘʟᴀʏ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎵* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <término de búsqueda>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} dance trend 2026\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴏᴍᴀɴᴅᴏs*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#tiktoksearch* :: ʙᴜsᴄᴀʀ ʏ ᴅᴇsᴄᴀʀɢᴀʀ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#tiktok* :: ᴅᴇsᴄᴀʀɢᴀʀ ᴘᴏʀ ᴜʀʟ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#tt* :: ᴀʟɪᴀs ᴅᴇ #tiktok\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#ttdl* :: ᴀʟɪᴀs ᴅᴇ ᴅᴇsᴄᴀʀɢᴀ`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // ─── COMANDO TIKTOKSEARCH: BUSCAR Y MOSTRAR BOTONES ───
    await m.react('🔍')

    try {
        const searchResults = await apiKazuma.searchTikTok(text)
        const videoInfo = searchResults[0]

        if (!videoInfo) throw '❗ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ʀᴇsᴜʟᴛᴀᴅᴏs'

        const { title, thumbnail, author, authorUser, views, likes, duration, url } = videoInfo
        const vistas = formatNumber(views)
        const meGusta = formatNumber(likes)
        const rcanal = await getRcanal()

        // Guardar resultados en memoria para respuestas de botones
        global.tiktokTemp = global.tiktokTemp || {}
        global.tiktokTemp[m.sender] = {
            results: searchResults.slice(0, 8),
            url,
            title,
            thumbnail,
            author,
            authorUser,
            views: vistas,
            likes: meGusta,
            duration,
            timestampGuardado: Date.now()
        }

        const body =
            `> . ﹡ ﹟ 🎵 ׄ ⬭ *ᴛɪᴋᴛᴏᴋ sᴇᴀʀᴄʜ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎵* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${title.substring(0, 80)}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴀᴜᴛᴏʀ* :: ${author.substring(0, 40)} (@${authorUser})\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴠɪsᴛᴀs* :: ${vistas}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʟɪᴋᴇs* :: ${meGusta}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴅᴜʀᴀᴄɪᴏ́ɴ* :: ${duration}s\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʟɪɴᴋ* :: ${url}\n\n` +
            `> ## \`ᴇʟɪɢᴇ ᴜɴᴀ ᴏᴘᴄɪᴏ́ɴ ⬇️\``

        // ─── BOTONES NATIVOS INTERACTIVOS ───
        const { proto, generateWAMessageFromContent, WA_DEFAULT_EPHEMERAL } = (await import('@whiskeysockets/baileys')).default

        const interactiveMessage = {
            body: { text: body },
            footer: { text: `『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』⚡` },
            header: {
                title: title.substring(0, 60),
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📽️ ᴅᴇsᴄᴀʀɢᴀʀ ᴠɪᴅᴇᴏ',
                            id: `tiktok_video_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🎧 ᴅᴇsᴄᴀʀɢᴀʀ ᴀᴜᴅɪᴏ',
                            id: `tiktok_audio_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📥 ᴠɪᴅᴇᴏ sɪɴ ᴍᴀʀᴄᴀ',
                            id: `tiktok_nowm_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 ᴠᴇʀ ᴍᴀ́s ʀᴇsᴜʟᴛᴀᴅᴏs',
                            id: `tiktok_more_${m.sender}`
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔗 ᴠᴇʀ ᴇɴ ᴛɪᴋᴛᴏᴋ',
                            url: url,
                            merchant_url: url
                        })
                    }
                ],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== RESPUESTA A BOTONES ===================
async function handleButtonResponse(m, conn, command) {
    const data = global.tiktokTemp?.[m.sender]

    if (!data) {
        return conn.sendMessage(m.chat, {
            text: '❌ La búsqueda expiró. Usa #tiktoksearch de nuevo.'
        }, { quoted: m })
    }

    if (Date.now() - data.timestampGuardado > 600000) {
        delete global.tiktokTemp[m.sender]
        return conn.sendMessage(m.chat, {
            text: '❌ La búsqueda expiró. Usa #tiktoksearch de nuevo.'
        }, { quoted: m })
    }

    const { url, title, thumbnail } = data
    const rcanal = await getRcanal()

    await m.react('⏳')

    try {
        const thumbBuffer = await (await fetch(thumbnail)).buffer()
        const thumbResized = await resizeImage(thumbBuffer, 300)

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `${command.includes('audio') ? '🎵' : '📽️'}「 ${title} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbResized
                }
            }
        }

        // ─── VER MÁS RESULTADOS ───
        if (command === 'tiktok_more') {
            const moreResults = data.results.slice(1, 6)
            if (!moreResults.length) {
                return conn.sendMessage(m.chat, {
                    text: '❌ No hay más resultados disponibles.'
                }, { quoted: m })
            }

            const tempDir = path.join(__dirname, '..', 'tmp', 'tiktok')
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

            const downloadedFiles = []

            for (let i = 0; i < moreResults.length; i++) {
                const video = moreResults[i]
                try {
                    const dl = await apiKazuma.downloadTikTok(video.url)
                    if (!dl.status) continue

                    const safeName = `tt_${Date.now()}_${i}.mp4`
                    const filePath = path.join(tempDir, safeName)
                    await downloadMedia(dl.download, filePath)

                    downloadedFiles.push({
                        path: filePath,
                        title: dl.title || video.title,
                        author: dl.author || video.author
                    })
                } catch (e) {
                    console.error(`Error descargando video ${i}:`, e.message)
                }
            }

            if (!downloadedFiles.length) throw '❌ ɴᴏ sᴇ ᴘᴜᴅɪᴇʀᴏɴ ᴅᴇsᴄᴀʀɢᴀʀ ʟᴏs ᴠɪᴅᴇᴏs'

            for (let i = 0; i < downloadedFiles.length; i++) {
                const file = downloadedFiles[i]
                try {
                    await conn.sendMessage(m.chat, {
                        video: { url: file.path },
                        mimetype: 'video/mp4',
                        caption: `🎵 *${file.title?.substring(0, 60) || 'TikTok'}*\n👤 @${file.author || 'user'}\n📎 ${i + 1}/${downloadedFiles.length}`,
                        jpegThumbnail: thumbResized
                    }, { quoted: i === 0 ? fkontak : undefined })

                    if (i < downloadedFiles.length - 1) await new Promise(r => setTimeout(r, 1000))
                } catch (e) {
                    console.error(`Error enviando video ${i}:`, e.message)
                }
            }

            setTimeout(() => {
                downloadedFiles.forEach(file => {
                    try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path) } catch {}
                })
            }, 30000)

            await m.react('✅')
            return
        }

        // ─── DESCARGAR VIDEO / AUDIO ───
        const dl = await apiKazuma.downloadTikTok(url)
        if (!dl.status) throw dl.error || '❌ ᴇʀʀᴏʀ ᴀʟ ᴅᴇsᴄᴀʀɢᴀʀ'

        const tempDir = path.join(__dirname, '..', 'tmp', 'tiktok')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

        // ─── VIDEO NORMAL ───
        if (command === 'tiktok_video') {
            const safeName = `tt_video_${Date.now()}.mp4`
            const filePath = path.join(tempDir, safeName)
            await downloadMedia(dl.download, filePath)

            const size = await getSize(dl.download)
            if (size > 200 * 1024 * 1024) {
                await conn.sendMessage(m.chat, {
                    document: { url: filePath },
                    mimetype: 'video/mp4',
                    fileName: `${dl.title?.substring(0, 40) || 'TikTok'}.mp4`,
                    jpegThumbnail: thumbResized,
                    caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}*\n👤 ${dl.author}\n📦 ${formatSize(size)}`
                }, { quoted: fkontak })
            } else {
                await conn.sendMessage(m.chat, {
                    video: { url: filePath },
                    mimetype: 'video/mp4',
                    caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}*\n👤 ${dl.author}\n👁️ ${formatNumber(dl.views)} | ❤️ ${formatNumber(dl.likes)}`,
                    jpegThumbnail: thumbResized
                }, { quoted: fkontak })
            }

            setTimeout(() => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {} }, 30000)
        }

        // ─── AUDIO ───
        else if (command === 'tiktok_audio') {
            if (!dl.audio) throw '❌ ᴇʟ ᴀᴜᴅɪᴏ ɴᴏ ᴇsᴛᴀ́ ᴅɪsᴘᴏɴɪʙʟᴇ'

            const safeName = `tt_audio_${Date.now()}.mp3`
            const filePath = path.join(tempDir, safeName)
            await downloadMedia(dl.audio, filePath)

            await conn.sendMessage(m.chat, {
                audio: { url: filePath },
                mimetype: 'audio/mpeg',
                fileName: `${dl.title?.substring(0, 40) || 'TikTok Audio'}.mp3`
            }, { quoted: fkontak })

            setTimeout(() => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {} }, 30000)
        }

        // ─── VIDEO SIN MARCA DE AGUA ───
        else if (command === 'tiktok_nowm') {
            const safeName = `tt_nowm_${Date.now()}.mp4`
            const filePath = path.join(tempDir, safeName)
            await downloadMedia(dl.download, filePath)

            const size = await getSize(dl.download)
            if (size > 200 * 1024 * 1024) {
                await conn.sendMessage(m.chat, {
                    document: { url: filePath },
                    mimetype: 'video/mp4',
                    fileName: `${dl.title?.substring(0, 40) || 'TikTok'}_no_wm.mp4`,
                    jpegThumbnail: thumbResized,
                    caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}* (Sin marca)\n👤 ${dl.author}\n📦 ${formatSize(size)}`
                }, { quoted: fkontak })
            } else {
                await conn.sendMessage(m.chat, {
                    video: { url: filePath },
                    mimetype: 'video/mp4',
                    caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}* (Sin marca)\n👤 ${dl.author}\n👁️ ${formatNumber(dl.views)} | ❤️ ${formatNumber(dl.likes)}`,
                    jpegThumbnail: thumbResized
                }, { quoted: fkontak })
            }

            setTimeout(() => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {} }, 30000)
        }

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== DESCARGA DIRECTA POR URL ===================
async function handleDirectDownload(m, conn, text, command, usedPrefix) {
    if (!text?.trim()) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❗ *ᴜsᴏ* :: ${usedPrefix}${command} <URL de TikTok>\n\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} https://www.tiktok.com/@user/video/123456`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // Validar URL de TikTok
    const ttRegex = /(?:https?:\/\/)?(?:www\.|vm\.)?(?:tiktok\.com|vt\.tiktok\.com)\//i
    if (!ttRegex.test(text.trim())) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❌ *ᴜʀʟ ɪɴᴠᴀ́ʟɪᴅᴀ*\n\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀ ᴜɴᴀ ᴜʀʟ ᴠᴀ́ʟɪᴅᴀ ᴅᴇ ᴛɪᴋᴛᴏᴋ.`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        const postUrl = text.trim()
        const dl = await apiKazuma.downloadTikTok(postUrl)

        if (!dl.status) throw dl.error || '❌ ɴᴏ sᴇ ᴘᴜᴅᴏ ᴅᴇsᴄᴀʀɢᴀʀ'

        const thumbBuffer = dl.thumbnail ? await (await fetch(dl.thumbnail)).buffer().then(b => resizeImage(b, 300)).catch(() => null) : null
        const rcanal = await getRcanal()

        const processingMsg =
            `> . ﹡ ﹟ ⏳ ׄ ⬭ *ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎵* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${dl.title?.substring(0, 80) || 'Sin título'}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴀᴜᴛᴏʀ* :: ${dl.author}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴘʀᴏᴄᴇsᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `🎵「 ${dl.title?.substring(0, 40) || 'TikTok'} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbBuffer || Buffer.alloc(0)
                }
            }
        }

        const tempDir = path.join(__dirname, '..', 'tmp', 'tiktok')
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

        const safeName = `tt_direct_${Date.now()}.mp4`
        const filePath = path.join(tempDir, safeName)
        await downloadMedia(dl.download, filePath)

        const size = await getSize(dl.download)
        if (size > 200 * 1024 * 1024) {
            await conn.sendMessage(m.chat, {
                document: { url: filePath },
                mimetype: 'video/mp4',
                fileName: `${dl.title?.substring(0, 40) || 'TikTok'}.mp4`,
                jpegThumbnail: thumbBuffer,
                caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}*\n👤 ${dl.author}\n📦 ${formatSize(size)}`
            }, { quoted: fkontak })
        } else {
            await conn.sendMessage(m.chat, {
                video: { url: filePath },
                mimetype: 'video/mp4',
                caption: `🎵 *${dl.title?.substring(0, 60) || 'TikTok'}*\n👤 ${dl.author}\n👁️ ${formatNumber(dl.views)} | ❤️ ${formatNumber(dl.likes)}`,
                jpegThumbnail: thumbBuffer
            }, { quoted: fkontak })
        }

        setTimeout(() => { try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath) } catch {} }, 30000)

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['tiktoksearch', 'tiktok', 'tt', 'ttdl']
handler.tags = ['descargas', 'busqueda']
handler.command = [
    'tiktoksearch', 'ttsearch', 'tiktok', 'tt', 'ttdl', 'tiktokdl',
    'tiktok_video', 'tiktok_audio', 'tiktok_nowm', 'tiktok_more'
]
handler.register = false
handler.group = false
handler.reg = true

export default handler
