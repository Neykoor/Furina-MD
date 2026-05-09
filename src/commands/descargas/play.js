// src/commands/descargas/play.js
// Play + Descargas YouTube con botones interactivos nativos
// Sin APIs externas — usa yt-dlp directamente

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import yts from 'yt-search'
import axios from 'axios'
import Jimp from 'jimp'

const execAsync = promisify(exec)
const TEMP_DIR = './temp/descargas'
const YTDLP = global.ytDlpPath || 'yt-dlp'

// ─── CREAR CARPETA TEMPORAL ───
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

// ─── CONSTANTES ───
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const MAX_AUDIO_SIZE = 100 * 1024 * 1024
const DOWNLOAD_TIMEOUT = 180000

// ─── REDIMENSIONAR THUMBNAIL ───
async function resizeImage(buffer, size = 300) {
    try {
        const image = await Jimp.read(buffer)
        return await image.resize(size, size).getBufferAsync(Jimp.MIME_JPEG)
    } catch {
        return buffer
    }
}

// ─── FORMATO DE TAMAÑO ───
function formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return 'Desconocido'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    bytes = Number(bytes)
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024
        i++
    }
    return `${bytes.toFixed(2)} ${units[i]}`
}

// ─── OBTENER TAMAÑO DE URL ───
async function getSize(url) {
    try {
        const res = await axios.head(url, { timeout: 10000 })
        return parseInt(res.headers['content-length'], 10) || 0
    } catch {
        return 0
    }
}

// ─── INFO CANAL (RCANAL) ───
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

// ─── DESCARGAR AUDIO COMO DOCUMENTO ───
async function descargarAudioDoc(url) {
    const id = Date.now()
    const outputPath = path.join(TEMP_DIR, `audio_${id}.mp3`)
    
    try {
        const cmd = `${YTDLP} -f bestaudio --extract-audio --audio-format mp3 --audio-quality 2 -o "${outputPath}" "${url}"`
        await execAsync(cmd, { timeout: DOWNLOAD_TIMEOUT })
        
        if (!fs.existsSync(outputPath)) {
            return { success: false, error: 'No se pudo descargar el audio' }
        }
        
        const stats = fs.statSync(outputPath)
        if (stats.size > MAX_AUDIO_SIZE) {
            fs.unlinkSync(outputPath)
            return { success: false, error: `El audio pesa ${formatSize(stats.size)}. Máximo permitido: 100MB` }
        }
        
        const buffer = fs.readFileSync(outputPath)
        fs.unlinkSync(outputPath)
        
        return {
            success: true,
            buffer,
            size: stats.size,
            filename: `audio_${id}.mp3`,
            mimetype: 'audio/mpeg'
        }
    } catch (error) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        return { success: false, error: error.message }
    }
}

// ─── DESCARGAR VIDEO COMO DOCUMENTO ───
async function descargarVideoDoc(url) {
    const id = Date.now()
    const outputPath = path.join(TEMP_DIR, `video_${id}.mp4`)
    
    try {
        const cmd = `${YTDLP} -f "best[filesize<100M]" --merge-output-format mp4 -o "${outputPath}" "${url}"`
        await execAsync(cmd, { timeout: DOWNLOAD_TIMEOUT })
        
        if (!fs.existsSync(outputPath)) {
            return { success: false, error: 'No se pudo descargar el video' }
        }
        
        const stats = fs.statSync(outputPath)
        if (stats.size > MAX_VIDEO_SIZE) {
            fs.unlinkSync(outputPath)
            return { success: false, error: `El video pesa ${formatSize(stats.size)}. Máximo permitido: 100MB` }
        }
        
        const buffer = fs.readFileSync(outputPath)
        fs.unlinkSync(outputPath)
        
        return {
            success: true,
            buffer,
            size: stats.size,
            filename: `video_${id}.mp4`,
            mimetype: 'video/mp4'
        }
    } catch (error) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        return { success: false, error: error.message }
    }
}

// ─── DESCARGAR AUDIO DIRECTO (STREAM) ───
async function descargarAudioStream(url) {
    try {
        const cmd = `${YTDLP} -f bestaudio --extract-audio --audio-format mp3 --audio-quality 2 -o - "${url}"`
        const { stdout } = await execAsync(cmd, { 
            timeout: DOWNLOAD_TIMEOUT,
            encoding: 'buffer',
            maxBuffer: MAX_AUDIO_SIZE
        })
        
        if (!stdout || stdout.length === 0) {
            return { success: false, error: 'No se pudo obtener el audio' }
        }
        
        return {
            success: true,
            buffer: stdout,
            mimetype: 'audio/mpeg'
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ─── DESCARGAR VIDEO DIRECTO (STREAM) ───
async function descargarVideoStream(url) {
    try {
        const cmd = `${YTDLP} -f "best[filesize<100M]" --merge-output-format mp4 -o - "${url}"`
        const { stdout } = await execAsync(cmd, { 
            timeout: DOWNLOAD_TIMEOUT,
            encoding: 'buffer',
            maxBuffer: MAX_VIDEO_SIZE
        })
        
        if (!stdout || stdout.length === 0) {
            return { success: false, error: 'No se pudo obtener el video' }
        }
        
        return {
            success: true,
            buffer: stdout,
            mimetype: 'video/mp4'
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// ─── OBTENER INFO DEL VIDEO CON YT-DLP ───
async function infoVideoYtDlp(url) {
    try {
        const { stdout } = await execAsync(`${YTDLP} -j --no-download "${url}"`, { timeout: 30000 })
        return JSON.parse(stdout)
    } catch {
        return null
    }
}

// ─── HANDLER PRINCIPAL ───
const handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // ─── VERIFICAR QUE YT-DLP ESTÁ DISPONIBLE ───
    if (!global.ytDlpPath && YTDLP === 'yt-dlp') {
        try {
            await execAsync('yt-dlp --version', { timeout: 5000 })
        } catch {
            return conn.sendMessage(m.chat, {
                text: '❌ *Sistema de descargas no disponible.*\n\nEl administrador del servidor debe instalar yt-dlp:\n```pip install yt-dlp```'
            }, { quoted: m })
        }
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

    // ─── COMANDOS DIRECTOS (ytmp3, ytmp4, etc) ───
    if (['ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc'].includes(command)) {
        return await handleDirectDownload(m, conn, text, command, usedPrefix)
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

// ─── RESPUESTA A BOTONES ───
async function handleButtonResponse(m, conn, command) {
    const data = global.descargasTemp?.[m.sender]
    
    if (!data) {
        return conn.sendMessage(m.chat, {
            text: '❌ La búsqueda expiró. Usa #play de nuevo.'
        }, { quoted: m })
    }

    // Limpiar datos antiguos (más de 10 minutos)
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

        // ─── AUDIO NORMAL ───
        if (command === 'play_audio') {
            const result = await descargarAudioStream(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                audio: result.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: fkontak })
        }
        
        // ─── VIDEO NORMAL ───
        else if (command === 'play_video') {
            const result = await descargarVideoStream(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                video: result.buffer,
                mimetype: 'video/mp4',
                caption: `ׅㅤ𓏸𓈒ㅤׄ 🎬 *${title}*`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── AUDIO DOCUMENTO ───
        else if (command === 'play_audiodoc') {
            await conn.sendMessage(m.chat, {
                text: `⏳ *Descargando audio como documento...*`
            }, { quoted: m })

            const result = await descargarAudioDoc(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                document: result.buffer,
                mimetype: result.mimetype,
                fileName: result.filename,
                caption: `🎵 *${title}*\n📦 ${formatSize(result.size)}`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── VIDEO DOCUMENTO ───
        else if (command === 'play_videodoc') {
            await conn.sendMessage(m.chat, {
                text: `⏳ *Descargando video como documento...*`
            }, { quoted: m })

            const result = await descargarVideoDoc(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                document: result.buffer,
                mimetype: result.mimetype,
                fileName: result.filename,
                caption: `🎬 *${title}*\n📦 ${formatSize(result.size)}`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// ─── DESCARGA DIRECTA (ytmp3, ytmp4, etc) ───
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
            url = v.url
            title = v.title
            thumbnail = v.thumbnail
            author = v.author?.name || "Desconocido"
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

        // ─── YTMP3 ───
        if (command === 'ytmp3') {
            const result = await descargarAudioStream(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                audio: result.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: fkontak })
        }
        
        // ─── YTMP4 ───
        else if (command === 'ytmp4') {
            const result = await descargarVideoStream(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                video: result.buffer,
                mimetype: 'video/mp4',
                caption: `ׅㅤ𓏸𓈒ㅤׄ 🎬 *${title}*`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── YTMP3DOC ───
        else if (command === 'ytmp3doc') {
            const result = await descargarAudioDoc(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                document: result.buffer,
                mimetype: result.mimetype,
                fileName: result.filename,
                caption: `🎵 *${title}*\n📦 ${formatSize(result.size)}`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }
        
        // ─── YTMP4DOC ───
        else if (command === 'ytmp4doc') {
            const result = await descargarVideoDoc(url)
            if (!result.success) throw result.error

            await conn.sendMessage(m.chat, {
                document: result.buffer,
                mimetype: result.mimetype,
                fileName: result.filename,
                caption: `🎬 *${title}*\n📦 ${formatSize(result.size)}`,
                jpegThumbnail: thumbResized
            }, { quoted: fkontak })
        }

        await m.react('✅')
    } catch (e) {
        await m.react('❌')
        return conn.reply(m.chat, typeof e === 'string' ? e : `ׅㅤ𓏸𓈒ㅤׄ ⚠️ *ᴇʀʀᴏʀ* :: ${e.message}`, m)
    }
}

// ─── COMANDOS ───
handler.help = ['play', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc']
handler.tags = ['descargas']
handler.command = ['play', 'ytmp3', 'ytmp4', 'ytmp3doc', 'ytmp4doc', 'play_audio', 'play_video', 'play_audiodoc', 'play_videodoc']
handler.register = false
handler.group = false
handler.reg = true

export default handler
