import fetch from "node-fetch"
import yts from "yt-search"
import Jimp from "jimp"
import axios from "axios"
import fs from "fs"
import { fileURLToPath } from "url"
import path, { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MAX_FILE_SIZE = 500 * 1024 * 1024
const AUDIO_DOC_THRESHOLD = 30 * 1024 * 1024

async function resizeImage(buffer, size = 300) {
    try {
        const image = await Jimp.read(buffer)
        return await image.resize(size, size).getBufferAsync(Jimp.MIME_JPEG)
    } catch {
        return buffer
    }
}

// =================== API SAVENOW ===================
const savenowApi = {
    name: "Savenow/Y2Down API",
    key: "dfcb6d76f2f6a9894gjkege8a4ab232222",
    agent: "Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0",
    referer: "https://y2down.cc/enSB/",
    ytdl: async function(url, format) {
        try {
            const initUrl = `https://p.savenow.to/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(url)}&api=${this.key}`
            const init = await fetch(initUrl, { headers: { "User-Agent": this.agent, "Referer": this.referer } })
            const data = await init.json()
            if (!data.success) return { error: data.message || "Failed to start download" }
            const id = data.id
            const progressUrl = `https://p.savenow.to/api/progress?id=${id}`
            let attempts = 0
            while (attempts < 30) {
                await new Promise(r => setTimeout(r, 2000))
                attempts++
                const response = await fetch(progressUrl, { headers: { "User-Agent": this.agent, "Referer": this.referer } })
                const status = await response.json()
                if (status.progress === 1000) return { title: data.title || data.info?.title, image: data.info?.image, link: status.download_url }
            }
            return { error: "Timeout" }
        } catch (e) { return { error: e.message } }
    },
    download: async function(link, type = "audio") {
        try {
            const videoId = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
            if (!videoId) return { status: false, error: "ID de video no válido" }
            const videoInfo = await yts({ videoId })
            let result
            if (type === "audio") {
                result = await this.ytdl(link, "mp3")
                if (result.error) result = await this.ytdl(link, "m4a")
            } else {
                for (const fmt of ["720", "360", "480", "240", "144", "1080"]) {
                    result = await this.ytdl(link, fmt)
                    if (!result.error) break
                }
            }
            if (result.error) return { status: false, error: result.error }
            return {
                status: true,
                result: {
                    title: result.title || videoInfo.title || "Sin título",
                    author: videoInfo.author?.name || "Desconocido",
                    views: videoInfo.views || "0",
                    timestamp: videoInfo.timestamp || "0:00",
                    ago: videoInfo.ago || "Desconocido",
                    format: type === "audio" ? "mp3" : "mp4",
                    download: result.link,
                    thumbnail: result.image || videoInfo.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                }
            }
        } catch (e) { return { status: false, error: e.message } }
    }
}

const amScraperApi = {
    baseUrl: "https://scrapers.hostrta.win/scraper/24",
    download: async (link, type = "audio") => {
        try {
            const videoId = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
            if (!videoId) return { status: false, error: "ID no válido" }
            const videoInfo = await yts({ videoId })
            const response = await axios.get(`${amScraperApi.baseUrl}?url=${encodeURIComponent(link)}`, { timeout: 15000 })
            if (!response.data || response.data.error) return { status: false, error: response.data?.error || "Error" }
            const data = response.data
            let downloadUrl = null, formatType = null
            if (type === "audio") {
                downloadUrl = data.audio?.url; formatType = "mp3"
            } else {
                downloadUrl = data.video?.url; formatType = "mp4"
            }
            if (!downloadUrl) return { status: false, error: "Formato no disponible" }
            return {
                status: true,
                result: {
                    title: videoInfo.title || "Sin título",
                    author: videoInfo.author?.name || "Desconocido",
                    views: videoInfo.views || "0",
                    timestamp: videoInfo.timestamp || "0:00",
                    ago: videoInfo.ago || "Desconocido",
                    format: formatType,
                    download: downloadUrl,
                    thumbnail: videoInfo.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                }
            }
        } catch (e) { return { status: false, error: e.message } }
    }
}

async function downloadWithFallback(url, type = 'audio') {
    let result = await savenowApi.download(url, type)
    if (result.status) return result
    result = await amScraperApi.download(url, type)
    if (result.status) return result
    return { status: false, error: "No se pudo descargar el contenido." }
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
    
    // ─── COMANDOS DIRECTOS (ytmp3, ytmp4, etc) ───
    if (['ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc'].includes(command)) {
        return await handleDirectDownload(m, conn, text, command, usedPrefix)
    }

    // ─── SIN TEXTO: MOSTRAR AYUDA ───
    if (!text?.trim()) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `> . ﹡ ﹟ 📥 ׄ ⬭ *ʏᴏᴜᴛᴜʙᴇ ᴘʟᴀʏ*\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎵* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ${usedPrefix}${command} <canción/video>\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: ${usedPrefix}${command} Bad Bunny Tití\n\n` +
                  `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄᴏᴍᴀɴᴅᴏs*\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#play* :: ʙᴜsᴄᴀʀ ʏ ᴅᴇsᴄᴀʀɢᴀʀ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#ytmp3* :: sᴏʟᴏ ᴀᴜᴅɪᴏ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#ytmp4* :: sᴏʟᴏ ᴠɪᴅᴇᴏ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#ytmp3doc* :: ᴀᴜᴅɪᴏ ᴅᴏᴄᴜᴍᴇɴᴛᴏ\n` +
                  `ׅㅤ𓏸𓈒ㅤׄ *#ytmp4doc* :: ᴠɪᴅᴇᴏ ᴅᴏᴄᴜᴍᴇɴᴛᴏ`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    // ─── COMANDO PLAY: BUSCAR Y MOSTRAR BOTONES ───
    await m.react('🔍')

    try {
        const search = await yts(text)
        const videoInfo = search.all?.[0]
        if (!videoInfo) throw '❗ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ʀᴇsᴜʟᴛᴀᴅᴏs'

        const { title, thumbnail, timestamp, views, ago, url, author } = videoInfo
        const vistas = views?.toLocaleString?.() || 'Desconocido'
        const rcanal = await getRcanal()

        // Guardar en memoria para respuestas de botones
        global.descargasTemp = global.descargasTemp || {}
        global.descargasTemp[m.sender] = { 
            url, 
            title, 
            thumbnail, 
            author: author?.name || 'Desconocido',
            timestamp, 
            views: vistas, 
            ago,
            timestampGuardado: Date.now()
        }

        const body =
            `> . ﹡ ﹟ 🎬 ׄ ⬭ *ʏᴏᴜᴛᴜʙᴇ ᴘʟᴀʏ*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎵* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${title.substring(0, 80)}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴄᴀɴᴀʟ* :: ${(author?.name || 'Desconocido').substring(0, 40)}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴠɪsᴛᴀs* :: ${vistas}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴅᴜʀᴀᴄɪᴏ́ɴ* :: ${timestamp}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *sᴜʙɪᴅᴏ* :: ${ago}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ʟɪɴᴋ* :: ${url}\n\n` +
            `> ## \`ᴇʟɪɢᴇ ᴜɴ ᴏᴘᴄɪᴏ́ɴ ⬇️\``

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
                            display_text: '🎧 ᴀᴜᴅɪᴏ',
                            id: `play_audio_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📽️ ᴠɪᴅᴇᴏ',
                            id: `play_video_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '💿 ᴀᴜᴅɪᴏ ᴅᴏᴄ',
                            id: `play_audiodoc_${m.sender}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🎥 ᴠɪᴅᴇᴏ ᴅᴏᴄ',
                            id: `play_videodoc_${m.sender}`
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🔗 ᴠᴇʀ ᴇɴ ʏᴏᴜᴛᴜʙᴇ',
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
    const data = global.descargasTemp?.[m.sender]
    
    if (!data) {
        return conn.sendMessage(m.chat, {
            text: '❌ La búsqueda expiró. Usa #play de nuevo.'
        }, { quoted: m })
    }

    if (Date.now() - data.timestampGuardado > 600000) {
        delete global.descargasTemp[m.sender]
        return conn.sendMessage(m.chat, {
            text: '❌ La búsqueda expiró. Usa #play de nuevo.'
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
                    title: `${command.includes('audio') ? '🎵' : '🎬'}「 ${title} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbResized
                }
            }
        }

        const type = command.includes('audio') ? 'audio' : 'video'
        const dl = await downloadWithFallback(url, type)
        if (!dl.status) throw dl.error || '❌ ᴇʀʀᴏʀ ᴀʟ ᴅᴇsᴄᴀʀɢᴀʀ'

        // ─── AUDIO NORMAL ───
        if (command === 'play_audio') {
            await conn.sendMessage(m.chat, {
                audio: { url: dl.result.download },
                mimetype: 'audio/mpeg',
                fileName: `${dl.result.title}.mp3`
            }, { quoted: fkontak })
        }
        
        // ─── VIDEO NORMAL ───
        else if (command === 'play_video') {
            const size = await getSize(dl.result.download)
            if (size > 200 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}\nׅㅤ𓏸𓈒ㅤׄ 💡 *ᴜsᴀ* :: #play_videodoc`
            
            await conn.sendMessage(m.chat, {
                video: { url: dl.result.download },
                mimetype: 'video/mp4',
                caption: `ׅㅤ𓏸𓈒ㅤׄ 🎬 *${dl.result.title}*`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── AUDIO DOCUMENTO ───
        else if (command === 'play_audiodoc') {
            const size = await getSize(dl.result.download)
            if (size > 600 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}`
            
            await conn.sendMessage(m.chat, {
                document: { url: dl.result.download },
                mimetype: 'audio/mpeg',
                fileName: `${dl.result.title}.mp3`,
                jpegThumbnail: thumbResized,
                caption: `🎵 *${dl.result.title}*\n📦 ${formatSize(size)}`
            }, { quoted: fkontak })
        }
        
        // ─── VIDEO DOCUMENTO ───
        else if (command === 'play_videodoc') {
            const size = await getSize(dl.result.download)
            if (size > 600 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}`
            
            await conn.sendMessage(m.chat, {
                document: { url: dl.result.download },
                mimetype: 'video/mp4',
                fileName: `${dl.result.title}.mp4`,
                jpegThumbnail: thumbResized,
                caption: `🎬 *${dl.result.title}*\n📦 ${formatSize(size)}`
            }, { quoted: fkontak })
        }

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== DESCARGA DIRECTA ===================
async function handleDirectDownload(m, conn, text, command, usedPrefix) {
    if (!text?.trim()) {
        const rcanal = await getRcanal()
        return conn.sendMessage(m.chat, {
            text: `ׅㅤ𓏸𓈒ㅤׄ ❗ *ᴜsᴏ* :: ${usedPrefix}${command} <nombre o URL>`,
            contextInfo: rcanal
        }, { quoted: m })
    }

    await m.react('⏳')

    try {
        let url, title, thumbnail, author

        if (/youtube.com|youtu.be/.test(text)) {
            const id = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
            if (!id) throw '❌ ᴜʀʟ ɪɴᴠᴀ́ʟɪᴅᴀ'
            const s = await yts({ videoId: id })
            url = `https://www.youtube.com/watch?v=${id}`
            title = s.title || "Sin título"
            thumbnail = s.thumbnail
            author = s.author?.name || "Desconocido"
        } else {
            const s = await yts(text)
            if (!s.videos.length) throw "❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ʀᴇsᴜʟᴛᴀᴅᴏs"
            const v = s.videos[0]
            url = v.url; title = v.title; thumbnail = v.thumbnail; author = v.author?.name || "Desconocido"
        }

        const thumbBuffer = await (await fetch(thumbnail)).buffer()
        const thumbResized = await resizeImage(thumbBuffer, 300)
        const rcanal = await getRcanal()

        const processingMsg =
            `> . ﹡ ﹟ ⏳ ׄ ⬭ *ᴅᴇsᴄᴀʀɢᴀɴᴅᴏ...*\n\n` +
            `*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜${command.includes('mp3') ? '🎵' : '🎬'}* ㅤ֢ㅤ⸱ㅤᯭִ*\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴛɪ́ᴛᴜʟᴏ* :: ${title}\n` +
            `ׅㅤ𓏸𓈒ㅤׄ *ᴇsᴛᴀᴅᴏ* :: ᴘʀᴏᴄᴇsᴀɴᴅᴏ...`

        await conn.sendMessage(m.chat, { text: processingMsg, contextInfo: rcanal }, { quoted: m })

        const fkontak = {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: {
                documentMessage: {
                    title: `${command.includes('mp3') ? '🎵' : '🎬'}「 ${title} 」⚡`,
                    fileName: `ᴅᴇsᴄᴀʀɢᴀs ᴀsᴛᴀ-ʙᴏᴛ`,
                    jpegThumbnail: thumbResized
                }
            }
        }

        const type = command.includes('mp3') ? 'audio' : 'video'
        const dl = await downloadWithFallback(url, type)
        if (!dl.status) throw dl.error || '❌ ᴇʀʀᴏʀ ᴀʟ ᴅᴇsᴄᴀʀɢᴀʀ'

        // ─── YTMP3 ───
        if (command === 'ytmp3') {
            await conn.sendMessage(m.chat, {
                audio: { url: dl.result.download },
                mimetype: 'audio/mpeg',
                fileName: `${dl.result.title}.mp3`
            }, { quoted: fkontak })
        }
        
        // ─── YTMP4 ───
        else if (command === 'ytmp4') {
            const size = await getSize(dl.result.download)
            if (size > 200 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}\nׅㅤ𓏸𓈒ㅤׄ 💡 *ᴜsᴀ* :: ${usedPrefix}ytmp4doc`
            
            await conn.sendMessage(m.chat, {
                video: { url: dl.result.download },
                mimetype: 'video/mp4',
                caption: `ׅㅤ𓏸𓈒ㅤׄ 🎬 *${dl.result.title}*`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── YTMP3DOC ───
        else if (command === 'ytmp3doc') {
            const size = await getSize(dl.result.download)
            if (size > 600 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}`
            
            await conn.sendMessage(m.chat, {
                document: { url: dl.result.download },
                mimetype: 'audio/mpeg',
                fileName: `${dl.result.title}.mp3`,
                jpegThumbnail: thumbResized,
                caption: `🎵 *${dl.result.title}*\n📦 ${formatSize(size)}`
            }, { quoted: fkontak })
        }
        
        // ─── YTMP4DOC ───
        else if (command === 'ytmp4doc') {
            const size = await getSize(dl.result.download)
            if (size > 600 * 1024 * 1024) throw `ׅㅤ𓏸𓈒ㅤׄ 📦 *ᴅᴇᴍᴀsɪᴀᴅᴏ ɢʀᴀɴᴅᴇ* :: ${formatSize(size)}`
            
            await conn.sendMessage(m.chat, {
                document: { url: dl.result.download },
                mimetype: 'video/mp4',
                fileName: `${dl.result.title}.mp4`,
                jpegThumbnail: thumbResized,
                caption: `🎬 *${dl.result.title}*\n📦 ${formatSize(size)}`
            }, { quoted: fkontak })
        }

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// =================== COMANDOS ===================
handler.help = ['play', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc']
handler.tags = ['descargas']
handler.command = ['play', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc', 'play_audio', 'play_video', 'play_audiodoc', 'play_videodoc']
handler.register = false
handler.group = false
handler.reg = true

export default handler
