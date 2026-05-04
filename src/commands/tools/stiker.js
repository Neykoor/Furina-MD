import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import crypto from 'crypto'
import axios from 'axios'
import fetch from 'node-fetch'
import FormData from 'form-data'

const execAsync = promisify(exec)

// ========== UTILIDADES ==========
const delay = (ms) => new Promise(r => setTimeout(r, ms))
const tmpDir = path.join(process.cwd(), 'tmp')

const ensureTmp = async () => {
    try { await fs.mkdir(tmpDir, { recursive: true }) } catch {}
}

const getTmpPath = (ext) => path.join(tmpDir, `${crypto.randomUUID()}.${ext}`)

// Descargar buffer de URL o mensaje
const downloadMedia = async (msg) => {
    if (!msg) return null
    const buffer = await msg.download?.() || await msg.download?.call(msg)
    return buffer || null
}

// ========== INFO CANAL (RCANAL) ==========
const getRcanal = async () => {
    try {
        const thumb = await (await fetch(global.icono || 'https://telegra.ph/file/24fa902ead26340f3df2c.png')).buffer()
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
                renderLargerThumbnail: true
            }
        }
    } catch { return {} }
}

// ========== GENERADOR DE STICKERS WEBP ==========
// Convierte cualquier imagen/video a sticker WebP usando ffmpeg
const createSticker = async (inputBuffer, options = {}) => {
    await ensureTmp()
    const inputPath = getTmpPath(options.isVideo ? 'mp4' : 'png')
    const outputPath = getTmpPath('webp')
    
    await fs.writeFile(inputPath, inputBuffer)
    
    const { pack = 'ᴀsᴛᴀ-ʙᴏᴛ', author = 'ғᴇʀɴᴀɴᴅᴏ', isVideo = false } = options
    
    // Metadata EXIF para stickers
    const exifPath = getTmpPath('json')
    const exifData = {
        "sticker-pack-id": crypto.randomUUID(),
        "sticker-pack-name": pack,
        "sticker-pack-publisher": author,
        "emojis": options.emoji || ["🤖"]
    }
    await fs.writeFile(exifPath, JSON.stringify(exifData))
    
    let ffmpegCmd
    if (isVideo) {
        // Video sticker animado (8 segundos max, 30fps, 512x512)
        ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "fps=30,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:black@0" -c:v libwebp -lossless 1 -q:v 80 -loop 0 -preset default -an -vsync 0 -t 8 "${outputPath}" -y`
    } else {
        // Sticker estático
        ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:black@0" -c:v libwebp -lossless 1 -q:v 80 -preset default "${outputPath}" -y`
    }
    
    await execAsync(ffmpegCmd)
    
    // Añadir metadata EXIF usando webpmux
    const finalPath = getTmpPath('webp')
    await execAsync(`webpmux -set exif "${exifPath}" "${outputPath}" -o "${finalPath}"`)
    
    const result = await fs.readFile(finalPath)
    
    // Limpiar temporales
    try { await fs.unlink(inputPath) } catch {}
    try { await fs.unlink(outputPath) } catch {}
    try { await fs.unlink(exifPath) } catch {}
    try { await fs.unlink(finalPath) } catch {}
    
    return result
}

// ========== BRAT API ==========
const fetchBrat = async (text, animated = false, attempt = 1) => {
    const endpoint = animated 
        ? 'https://skyzxu-brat.hf.space/brat-animated'
        : 'https://skyzxu-brat.hf.space/brat'
    
    try {
        const res = await axios.get(endpoint, { 
            params: { text }, 
            responseType: 'arraybuffer',
            timeout: 30000 
        })
        return res.data
    } catch (e) {
        if (e.response?.status === 429 && attempt <= 3) {
            const retryAfter = (e.response.headers['retry-after'] || 5) * 1000
            await delay(retryAfter)
            return fetchBrat(text, animated, attempt + 1)
        }
        throw e
    }
}

// ========== EMOJIMIX API ==========
const fetchEmojimix = async (emoji1, emoji2) => {
    const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`
    const res = await fetch(url)
    const json = await res.json()
    if (!json.results?.length) throw new Error('Sin resultados para esa combinación')
    return json.results[0].url
}

// ========== QC (QUOTE CHAT) API ==========
const fetchQC = async (text, name, photoUrl) => {
    const quoteObj = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#1a1a2e',
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
            entities: [],
            avatar: true,
            from: {
                id: 1,
                name: name,
                photo: { url: photoUrl }
            },
            text: text,
            replyMessage: {}
        }]
    }
    
    const res = await axios.post('https://bot.lyo.su/quote/generate', quoteObj, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
    })
    
    return Buffer.from(res.data.result.image, 'base64')
}

// ========== WTP (WHATSAPP CONVERSATION) ==========
const fetchWTP = async (text, options = {}) => {
    // API alternativa para generar conversaciones tipo iPhone
    // Usando quotable.io como base y generando imagen personalizada
    
    const { name = 'iPhone User', time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isGroup = false } = options
    
    // Usar una API de generación de imágenes de conversación
    // o generar con canvas si está disponible
    
    // Método 1: API externa
    try {
        const params = new URLSearchParams({
            text: text,
            name: name,
            time: time,
            type: isGroup ? 'group' : 'private',
            theme: 'ios'
        })
        
        const res = await axios.get(`https://api.sdbots.tech/wtp?${params.toString()}`, {
            responseType: 'arraybuffer',
            timeout: 30000
        }).catch(() => null)
        
        if (res?.data) return res.data
    } catch {}
    
    // Método 2: Generar con quotable como fallback
    const quoteRes = await axios.post('https://bot.lyo.su/quote/generate', {
        type: 'quote',
        format: 'png',
        backgroundColor: '#ffffff',
        width: 512,
        height: 512,
        scale: 2,
        messages: [{
            entities: [],
            avatar: true,
            from: {
                id: 1,
                name: name,
                photo: { url: 'https://telegra.ph/file/24fa902ead26340f3df2c.png' }
            },
            text: text,
            replyMessage: {}
        }]
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
    })
    
    return Buffer.from(quoteRes.data.result.image, 'base64')
}

// ========== CONVERTIR WEBP A PNG ==========
const webpToPng = async (webpBuffer) => {
    await ensureTmp()
    const inputPath = getTmpPath('webp')
    const outputPath = getTmpPath('png')
    
    await fs.writeFile(inputPath, webpBuffer)
    await execAsync(`ffmpeg -i "${inputPath}" "${outputPath}" -y`)
    
    const result = await fs.readFile(outputPath)
    
    try { await fs.unlink(inputPath) } catch {}
    try { await fs.unlink(outputPath) } catch {}
    
    return result
}

// ========== HANDLER PRINCIPAL ==========
let handler = async (m, { conn, text, args, command, usedPrefix }) => {
    const rcanal = await getRcanal()
    
    // Obtener pack info del usuario o globales
    let userId = m.sender
    let packstickers = global.db?.data?.users?.[userId] || {}
    let texto1 = packstickers.text1 || global.packsticker || 'ᴀsᴛᴀ-ʙᴏᴛ'
    let texto2 = packstickers.text2 || global.packsticker2 || 'ғᴇʀɴᴀɴᴅᴏ'
    
    // Función helper para errores
    const sendError = async (emoji, msg) => {
        await m.react('✖️')
        return conn.sendMessage(m.chat, {
            text: `> . ﹡ ﹟ ${emoji} ׄ ⬭ *¡ᴇʀʀᴏʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜❌* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴇʀʀᴏʀ* :: ${msg}\nׅㅤ𓏸𓈒ㅤׄ *ʀᴇᴘᴏʀᴛ* :: \`${usedPrefix}report\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`,
            contextInfo: { ...rcanal }
        }, { quoted: m })
    }
    
    try {
        switch (command) {
            
            // ========== S / STICKER ==========
            case 's':
            case 'sticker':
            case 'stiker': {
                // Obtener media del mensaje citado o del mensaje actual
                const quoted = m.quoted || m
                const mime = (quoted.msg || quoted).mimetype || ''
                
                if (!mime) return sendError('🖼️', 'ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴᴀ ɪᴍᴀɢᴇɴ ᴏ ᴠɪᴅᴇᴏ ᴄᴏɴ #s')
                
                const isImage = mime.startsWith('image/')
                const isVideo = mime.startsWith('video/')
                
                if (!isImage && !isVideo) return sendError('🖼️', 'ꜱᴏʟᴏ ɪᴍᴀɢᴇɴᴇꜱ ᴏ ᴠɪᴅᴇᴏꜱ')
                
                await m.react('🕒')
                
                const buffer = await quoted.download()
                if (!buffer) return sendError('🖼️', 'ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ᴅᴇꜱᴄᴀʀɢᴀʀ ʟᴀ ᴍᴇᴅɪᴀ')
                
                const sticker = await createSticker(buffer, {
                    pack: texto1,
                    author: texto2,
                    isVideo: isVideo,
                    emoji: isVideo ? ['🎬'] : ['🖼️']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== IMG (STICKER A IMAGEN) ==========
            case 'img':
            case 'toimg': {
                if (!m.quoted) return sendError('🖼️', 'ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ ᴄᴏɴ #img')
                
                const mime = (m.quoted.msg || m.quoted).mimetype || ''
                if (!mime.includes('webp')) return sendError('🖼️', 'ᴇʟ ᴍᴇɴꜱᴀᴊᴇ ᴄɪᴛᴀᴅᴏ ᴅᴇʙᴇ ꜱᴇʀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ')
                
                await m.react('🕒')
                
                const buffer = await m.quoted.download()
                if (!buffer) return sendError('🖼️', 'ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ᴅᴇꜱᴄᴀʀɢᴀʀ ᴇʟ ꜱᴛɪᴄᴋᴇʀ')
                
                const pngBuffer = await webpToPng(buffer)
                
                await conn.sendMessage(m.chat, {
                    image: pngBuffer,
                    caption: `✅ *ꜱᴛɪᴄᴋᴇʀ ᴄᴏɴᴠᴇʀᴛɪᴅᴏ ᴀ ɪᴍᴀɢᴇɴ*`
                }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== BRAT ==========
            case 'brat': {
                text = m.quoted?.text || text
                if (!text) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 🖤 ׄ ⬭ *¡ʙʀᴀᴛ ꜱᴛɪᴄᴋᴇʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🖤* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#brat (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#brat hola mundo\`\nׅㅤ𓏸𓈒ㅤׄ *ᴀʟᴛᴇʀɴ* :: ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴ ᴍꜱᴊ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                await m.react('🕒')
                const buffer = await fetchBrat(text)
                const sticker = await createSticker(buffer, {
                    pack: texto1,
                    author: texto2,
                    emoji: ['🖤']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== BRATV ==========
            case 'bratv': {
                text = m.quoted?.text || text
                if (!text) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 🖤 ׄ ⬭ *¡ʙʀᴀᴛ ᴀɴɪᴍᴀᴅᴏ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🖤* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#bratv (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#bratv hola mundo\`\nׅㅤ𓏸𓈒ㅤׄ *ɴᴏᴛᴀ* :: ɢᴇɴᴇʀᴀ ꜱᴛɪᴄᴋᴇʀ ᴀɴɪᴍᴀᴅᴏ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                await m.react('🕒')
                const videoBuffer = await fetchBrat(text, true)
                const sticker = await createSticker(videoBuffer, {
                    pack: texto1,
                    author: texto2,
                    isVideo: true,
                    emoji: ['🎬']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== WTP ==========
            case 'wtp': {
                text = m.quoted?.text || text || args.join(' ')
                if (!text) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 📱 ׄ ⬭ *¡ᴡʜᴀᴛꜱᴀᴘᴘ ᴄᴏɴᴠᴇʀꜱᴀᴛɪᴏɴ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📱* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#wtp (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#wtp hola como estás\`\nׅㅤ𓏸𓈒ㅤׄ *ɴᴏᴛᴀ* :: ɢᴇɴᴇʀᴀ ᴄᴏɴᴠᴇʀꜱᴀᴄɪᴏ́ɴ ᴛɪᴘᴏ ɪᴘʜᴏɴᴇ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                await m.react('🕒')
                
                const name = await conn.getName(m.sender).catch(() => m.pushName || 'Usuario')
                const buffer = await fetchWTP(text, { name })
                const sticker = await createSticker(buffer, {
                    pack: texto1,
                    author: texto2,
                    emoji: ['📱']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== EMOJIMIX ==========
            case 'emojimix': {
                if (!args[0]) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 🎨 ׄ ⬭ *¡ᴇᴍᴏᴊɪ ᴍɪx!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎨* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#emojimix emoji1+emoji2\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#emojimix 👻+👀\`\nׅㅤ𓏸𓈒ㅤׄ *ɴᴏᴛᴀ* :: ᴄᴏᴍʙɪɴᴀ 2 ᴇᴍᴏᴊɪꜱ ᴇɴ ᴜɴᴏ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                let [emoji1, emoji2] = text.split(/\+|plus|y/i).map(e => e.trim())
                if (!emoji2) [emoji1, emoji2] = [args[0], args[1] || args[0]]
                
                if (!emoji1 || !emoji2) return sendError('🎨', 'ᴅᴇʙᴇꜱ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀʀ 2 ᴇᴍᴏᴊɪꜱ')
                
                await m.react('🕒')
                const imageUrl = await fetchEmojimix(emoji1, emoji2)
                const imageBuffer = await (await fetch(imageUrl)).buffer()
                
                const sticker = await createSticker(imageBuffer, {
                    pack: texto1,
                    author: texto2,
                    emoji: [emoji1, emoji2]
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== QC ==========
            case 'qc': {
                let textFinal = args.join(' ') || m.quoted?.text
                if (!textFinal) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 💬 ׄ ⬭ *¡ǫᴜᴏᴛᴇ ꜱᴛɪᴄᴋᴇʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜💬* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#qc (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#qc Este es mi mensaje\`\nׅㅤ𓏸𓈒ㅤׄ *ᴍáx* :: 30 ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                let target = m.quoted ? m.quoted.sender : m.sender
                const pp = await conn.profilePictureUrl(target).catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
                const nombre = await (async () =>
                    global.db?.data?.users?.[target]?.name ||
                    await conn.getName(target).catch(() => target.split('@')[0])
                )()
                
                let frase = textFinal.replace(new RegExp(`@${target.split('@')[0]}`, 'g'), '')
                
                if (frase.length > 30) {
                    await m.react('✖️')
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 💬 ׄ ⬭ *¡ᴇʀʀᴏʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜❌* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴇʀʀᴏʀ* :: ᴍáx. *30 ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ*\nׅㅤ𓏸𓈒ㅤׄ *ᴛᴜ ᴛᴇxᴛᴏ* :: ${frase.length} ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                await m.react('🕒')
                const buffer = await fetchQC(frase, nombre, pp)
                const sticker = await createSticker(buffer, {
                    pack: texto1,
                    author: texto2,
                    emoji: ['💬']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== TAKE / WM ==========
            case 'take':
            case 'wm': {
                if (!m.quoted) {
                    return conn.send                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ ✏️ ׄ ⬭ *¡ʀᴇɴᴏᴍʙʀᴀʀ ꜱᴛɪᴄᴋᴇʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜✏️* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ\nׅㅤ𓏸𓈒ㅤׄ *ꜱᴏʟᴏ ᴘᴀᴄᴋ* :: \`#take NuevoNombre\`\nׅㅤ𓏸𓈒ㅤׄ *ᴘᴀᴄᴋ + ᴀᴜᴛᴏʀ* :: \`#take Pack • Autor\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                
                const mime = (m.quoted.msg || m.quoted).mimetype || ''
                if (!mime.includes('webp')) return sendError('✏️', 'ᴅᴇʙᴇꜱ ʀᴇꜱᴘᴏɴᴅᴇʀ ᴀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ')
                
                await m.react('🕒')
                const stickerData = await m.quoted.download()
                if (!stickerData) return sendError('✏️', 'ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ᴅᴇꜱᴄᴀʀɢᴀʀ ᴇʟ ꜱᴛɪᴄᴋᴇʀ')
                
                const parts = text.split(/[\u2022|•]/).map(p => p.trim())
                const newPack = parts[0] || texto1
                const newAuthor = parts[1] || texto2
                
                const sticker = await createSticker(stickerData, {
                    pack: newPack,
                    author: newAuthor,
                    emoji: ['✏️']
                })
                
                await conn.sendMessage(m.chat, { sticker }, { quoted: m })
                await m.react('✔️')
                break
            }
        }
    } catch (e) {
        console.error(e)
        await sendError('⚠️', e.message || 'ᴇʀʀᴏʀ ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ')
    }
}

handler.tags = ['sticker']
handler.help = [
    's / sticker / stiker [responde a imagen/video]',
    'img / toimg [responde a sticker]',
    'brat <texto>',
    'bratv <texto>',
    'wtp <texto>',
    'emojimix <emoji1+emoji2>',
    'qc <texto>',
    'take / wm [responde a sticker]'
]
handler.command = ['s', 'sticker', 'stiker', 'img', 't