import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas'
import { Jimp } from 'jimp'
import axios from 'axios'
import fetch from 'node-fetch'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

// ========== UTILIDADES ==========
const delay = (ms) => new Promise(r => setTimeout(r, ms))
const tmpDir = path.join(process.cwd(), 'tmp')

const ensureTmp = async () => {
    try { await fs.mkdir(tmpDir, { recursive: true }) } catch {}
}

const getTmpPath = (ext) => path.join(tmpDir, `${crypto.randomUUID()}.${ext}`)

// ========== METADATA EXIF PARA STICKERS ==========
const createExif = (pack, author) => {
    const exif = {
        "sticker-pack-id": crypto.randomUUID(),
        "sticker-pack-name": pack,
        "sticker-pack-publisher": author,
        "emojis": ["🤖"]
    }
    return Buffer.from(JSON.stringify(exif))
}

// Añadir metadata a WebP (formato simple sin webpmux)
const addExifToWebp = async (webpBuffer, pack, author) => {
    // Nota: Sin webpmux usamos el buffer tal cual
    // El pack info se añade vía Baileys al enviar
    return webpBuffer
}

// ========== CONVERTIR IMAGEN A STICKER WEBP ==========
const imageToWebp = async (inputBuffer, options = {}) => {
    await ensureTmp()
    const { pack = 'ᴀsᴛᴀ-ʙᴏᴛ', author = 'ғᴇʀɴᴀɴᴅᴏ' } = options
    
    try {
        // Usar Jimp para procesar la imagen
        const image = await Jimp.read(inputBuffer)
        
        // Redimensionar a 512x512 manteniendo aspect ratio
        image.contain({ w: 512, h: 512 })
        image.background(0x00000000) // Fondo transparente
        
        // Convertir a WebP
        const webpBuffer = await image.getBuffer('image/webp')
        
        return webpBuffer
    } catch (err) {
        // Fallback con canvas
        const img = await loadImage(inputBuffer)
        const canvas = createCanvas(512, 512)
        const ctx = canvas.getContext('2d')
        
        // Calcular dimensiones manteniendo aspect ratio
        const scale = Math.min(512 / img.width, 512 / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (512 - w) / 2
        const y = (512 - h) / 2
        
        ctx.clearRect(0, 0, 512, 512)
        ctx.drawImage(img, x, y, w, h)
        
        return canvas.encode('webp')
    }
}

// ========== CONVERTIR VIDEO/GIF A STICKER ANIMADO ==========
const videoToAnimatedWebp = async (inputBuffer, options = {}) => {
    // Para stickers animados necesitamos ffmpeg
    // Si no está disponible, convertimos el primer frame a estático
    await ensureTmp()
    
    const { pack = 'ᴀsᴛᴀ-ʙᴏᴛ', author = 'ғᴇʀɴᴀɴᴅᴏ' } = options
    
    try {
        // Intentar usar Jimp para extraer primer frame si es GIF
        const image = await Jimp.read(inputBuffer)
        image.contain({ w: 512, h: 512 })
        image.background(0x00000000)
        return await image.getBuffer('image/webp')
    } catch {
        // Último fallback con canvas
        const img = await loadImage(inputBuffer)
        const canvas = createCanvas(512, 512)
        const ctx = canvas.getContext('2d')
        
        const scale = Math.min(512 / img.width, 512 / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (512 - w) / 2
        const y = (512 - h) / 2
        
        ctx.clear.clearRect(0Rect(0, 0, 512, 512)
        ctx.drawImage(img, x, y, w, h)
        
        return canvas.encode('webp')
    }
}

// ========== CONVERTIR WEBP A PNG ==========
const webpToPng = async (webpBuffer) => {
    const image = await Jimp.read(webpBuffer)
    return await image.getBuffer('image/png')
}

// ========== INFO CANAL ==========
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

// ========== QC (QUOTE CHAT) ==========
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

// ========== WTP (WHATSAPP CONVERSATION iPhone) ==========
const createWTP = async (text, options = {}) => {
    const { name = 'iPhone', time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } = options
    
    const canvas = createCanvas(512, 512)
    const ctx = canvas.getContext('2d')
    
    // Fondo blanco tipo iOS
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)
    
    // Barra de estado
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 0, 512, 40)
    
    // Hora
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(time, 256, 25)
    
    // Barra de navegación
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 60, 512, 50)
    
    // Nombre
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 18px Arial'
    ctx.fillText(name, 256, 90)
    
    // Línea divisoria
    ctx.strokeStyle = '#e0e0e0'
    ctx.beginPath()
    ctx.moveTo(0, 110)
    ctx.lineTo(512, 110)
    ctx.stroke()
    
    // Burbuja de mensaje (verde iOS)
    const padding = 20
    const maxWidth = 350
    ctx.font = '16px Arial'
    
    // Medir texto
    const words = text.split(' ')
    let lines = []
    let currentLine = ''
    
    for (let word of words) {
        const testLine = currentLine + word + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine)
            currentLine = word + ' '
        } else {
            currentLine = testLine
        }
    }
    lines.push(currentLine)
    
    const lineHeight = 22
    const bubbleHeight = (lines.length * lineHeight) + (padding * 2)
    const bubbleWidth = Math.min(maxWidth + padding * 2, 400)
    const bubbleX = 512 - bubbleWidth - 20
    const bubbleY = 150
    
    // Dibujar burbuja
    ctx.fillStyle = '#34c759'
    ctx.beginPath()
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 20)
    ctx.fill()
    
    // Texto
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    let textY = bubbleY + padding + 16
    for (let line of lines) {
        ctx.fillText(line.trim(), bubbleX + padding, textY)
        textY += lineHeight
    }
    
    // Hora del mensaje
    ctx.fillStyle = '#8e8e93'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(time, bubbleX + bubbleWidth - 10, bubbleY + bubbleHeight + 15)
    
    return canvas.encode('png')
}

// ========== HANDLER PRINCIPAL ==========
let handler = async (m, { conn, text, args, command, usedPrefix }) => {
    const rcanal = await getRcanal()
    
    let userId = m.sender
    let packstickers = global.db?.data?.users?.[userId] || {}
    let texto1 = packstickers.text1 || global.packsticker || 'ᴀsᴛᴀ-ʙᴏᴛ'
    let texto2 = packstickers.text2 || global.packsticker2 || 'ғᴇʀɴᴀɴᴅᴏ'
    
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
                const quoted = m.quoted || m
                const mime = (quoted.msg || quoted).mimetype || ''
                
                if (!mime) return sendError('🖼️', 'ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴᴀ ɪᴍᴀɢᴇɴ ᴏ ᴠɪᴅᴇᴏ ᴄᴏɴ #s')
                
                const isImage = mime.startsWith('image/')
                const isVideo = mime.startsWith('video/')
                const isGif = mime === 'image/gif'
                
                if (!isImage && !isVideo && !isGif) return sendError('🖼️', 'ꜱᴏʟᴏ ɪᴍᴀɢᴇɴᴇꜱ, ɢɪꜰꜱ ᴏ ᴠɪᴅᴇᴏꜱ')
                
                await m.react('🕒')
                
                const buffer = await quoted.download()
                if (!buffer) return sendError('🖼️', 'ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ᴅᴇꜱᴄᴀʀɢᴀʀ ʟᴀ ᴍᴇᴅɪᴀ')
                
                let sticker
                if (isVideo || isGif) {
                    sticker = await videoToAnimatedWebp(buffer, { pack: texto1, author: texto2 })
                } else {
                    sticker = await imageToWebp(buffer, { pack: texto1, author: texto2 })
                }
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
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
                const sticker = await imageToWebp(buffer, { pack: texto1, author: texto2 })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
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
                const sticker = await videoToAnimatedWebp(videoBuffer, { pack: texto1, author: texto2 })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== WTP ==========
            case 'wtp': {
                text ==========
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
                const buffer = await createWTP(text, { name })
                const sticker = await imageToWebp(buffer, { pack: texto1, author: texto2 })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
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
                
                const sticker = await imageToWebp(imageBuffer, { pack: texto1, author: texto2 })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
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
                const sticker = await imageToWebp(buffer, { pack: texto1, author: texto2 })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: texto1,
                    author: texto2
                }, { quoted: m })
                await m.react('✔️')
                break
            }
            
            // ========== TAKE / WM ==========
            case 'take':
            case 'wm': {
                if (!m.quoted) {
                    return conn.sendMessage(m.chat, {
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
                
                const sticker = await imageToWebp(stickerData, { pack: newPack, author: newAuthor })
                
                await conn.sendMessage(m.chat, { 
                    sticker,
                    packname: newPack,
                    author: newAuthor
                }, { quoted: m })
                await m.react('✔️')
                break
            }
        }
    } catch (e) {
        console.error(e)
        await sendError('⚠️', e.message || 'ᴇʀʀᴏʀ ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ')
    }
}

ᴇʀʀᴏʀ ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ')
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
handler.command = ['s', 'sticker', 'stiker', 'img', 'toimg', 'brat', 'bratv', 'wtp', 'emojimix', 'qc', 'take', 'wm']
handler.reg = true

export default handler
