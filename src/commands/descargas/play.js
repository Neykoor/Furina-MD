import fetch from "node-fetch"
import axios from "axios"
import { Jimp } from "jimp"
import fs from "fs"
import { fileURLToPath } from "url"
import path, { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// =================== CONFIGURACIÓN API KAZUMA ===================
const API_BASE = "https://rest.kazuma.giize.com"
const API_KEY = "kzm-BJyESIjG-FONfiuYH"

const apiKazuma = {
    search: async (query) => {
        try {
            const url = `${API_BASE}/api/search/youtube?apiKey=${API_KEY}&q=${encodeURIComponent(query)}`
            const res = await axios.get(url, { timeout: 15000 })
            const data = res.data

            // Soporte flexible según la estructura que devuelva la API
            const results = data.results || data.data || data.result || (Array.isArray(data) ? data : [data])
            if (!results || !results.length) throw new Error("Sin resultados")

            return results.map(v => ({
                title: v.title || "Sin título",
                url: v.url || v.link || `https://www.youtube.com/watch?v=${v.videoId || v.id}`,
                thumbnail: v.thumbnail || v.image || v.thumb || `https://i.ytimg.com/vi/${v.videoId || v.id}/hqdefault.jpg`,
                timestamp: v.duration || v.timestamp || v.length || "0:00",
                views: v.views || v.viewCount || v.play_count || "0",
                ago: v.ago || v.published || v.uploaded || "Desconocido",
                author: { name: v.author || v.channel || v.uploader || "Desconocido" },
                videoId: v.videoId || v.id || null
            }))
        } catch (e) {
            throw new Error(`Error de búsqueda: ${e.message}`)
        }
    },

    downloadAudio: async (videoUrl) => {
        try {
            const url = `${API_BASE}/api/download/ytaudio?url=${encodeURIComponent(videoUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            return {
                status: true,
                title: data.title || data.result?.title || "Sin título",
                download: data.download || data.result?.download || data.url || data.link || data.dl,
                thumbnail: data.thumbnail || data.result?.thumbnail || data.image,
                author: data.author || data.result?.author || data.channel || "Desconocido"
            }
        } catch (e) {
            return { status: false, error: e.message }
        }
    },

    downloadVideo: async (videoUrl) => {
        try {
            const url = `${API_BASE}/api/download/ytvideo?url=${encodeURIComponent(videoUrl)}&apiKey=${API_KEY}`
            const res = await axios.get(url, { timeout: 60000 })
            const data = res.data

            return {
                status: true,
                title: data.title || data.result?.title || "Sin título",
                download: data.download || data.result?.download || data.url || data.link || data.dl,
                thumbnail: data.thumbnail || data.result?.thumbnail || data.image,
                author: data.author || data.result?.author || data.channel || "Desconocido"
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

async function downloadWithFallback(url, type = 'audio') {
    const result = type === 'audio' 
        ? await apiKazuma.downloadAudio(url) 
        : await apiKazuma.downloadVideo(url)

    if (!result.status) return { status: false, error: result.error || "Error en la descarga" }

    return {
        status: true,
        result: {
            title: result.title,
            author: result.author,
            format: type === 'audio' ? 'mp3' : 'mp4',
            download: result.download,
            thumbnail: result.thumbnail
        }
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
        const searchResults = await apiKazuma.search(text)
        const videoInfo = searchResults[0]

        if (!videoInfo) throw '❗ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ʀᴇsᴜʟᴛᴀᴅᴏs'

        const { title, thumbnail, timestamp, views, ago, url, author } = videoInfo
        const vistas = typeof views === 'number' ? views.toLocaleString() : views
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
        let url, title, thumbnail, author, timestamp, views, ago

        if (/youtube.com|youtu.be/.test(text)) {
            url = text.trim()
            // Obtener info básica para mostrar
            try {
                const searchResults = await apiKazuma.search(url)
                const v = searchResults.find(x => x.url.includes(url.match(/[a-zA-Z0-9_-]{11}/)?.[0])) || searchResults[0]
                if (v) {
                    title = v.title
                    thumbnail = v.thumbnail
                    author = v.author?.name
                    timestamp = v.timestamp
                    views = v.views
                    ago = v.ago
                }
            } catch {
                title = "YouTube Video"
                thumbnail = `https://i.ytimg.com/vi/${url.match(/[a-zA-Z0-9_-]{11}/)?.[0]}/hqdefault.jpg`
                author = "Desconocido"
            }
        } else {
            const searchResults = await apiKazuma.search(text)
            if (!searchResults.length) throw "❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ʀᴇsᴜʟᴛᴀᴅᴏs"
            const v = searchResults[0]
            url = v.url; title = v.title; thumbnail = v.thumbnail; 
            author = v.author?.name || "Desconocido"; 
            timestamp = v.timestamp; views = v.views; ago = v.ago
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
