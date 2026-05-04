import { createCanvas, loadImage } from '@napi-rs/canvas'
import { Jimp } from 'jimp'
import axios from 'axios'
import fetch from 'node-fetch'

const delay = (ms) => new Promise(r => setTimeout(r, ms))

// Info canal
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

// Convertir imagen a WebP sticker
const toWebp = async (buffer) => {
    try {
        const image = await Jimp.read(buffer)
        image.contain({ w: 512, h: 512 })
        image.background(0x00000000)
        return await image.getBuffer('image/webp')
    } catch {
        const img = await loadImage(buffer)
        const canvas = createCanvas(512, 512)
        const ctx = canvas.getContext('2d')
        const scale = Math.min(512 / img.width, 512 / img.height)
        const w = img.width * scale
               const h = img.height * scale
        ctx.clearRect(0, 0, 512, 512)
        ctx.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h)
        return canvas.encode('webp')
    }
}

// WebP a PNG
const webpToPng = async (buffer) => {
    const image = await Jimp.read(buffer)
    return await image.getBuffer('image/png')
}

// APIs
const fetchBrat = async (text, animated = false, attempt = 1) => {
    const url = animated 
        ? 'https://skyzxu-brat.hf.space/brat-animated'
        : 'https://skyzxu-brat.hf.space/brat'
    try {
        const res = await axios.get(url, { params: { text }, responseType: 'arraybuffer', timeout: 30000 })
        return res.data
    } catch (e) {
        if (e.response?.status === 429 && attempt <= 3) {
            await delay((e.response.headers['retry-after'] || 5) * 1000)
            return fetchBrat(text, animated, attempt + 1)
        }
        throw e
    }
}

const fetchEmojimix = async (e1, e2) => {
    const url = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(e1)}_${encodeURIComponent(e2)}`
    const res = await fetch(url)
    const json = await res.json()
    if (!json.results?.length) throw new Error('Sin resultados')
    return json.results[0].url
}

const fetchQC = async (text, name, photo) => {
    const res = await axios.post('https://bot.lyo.su/quote/generate', {
        type: 'quote', format: 'png', backgroundColor: '#1a1a2e',
        width: 512, height: 768, scale: 2,
        messages: [{ entities: [], avatar: true, from: { id: 1, name, photo: { url: photo } }, text, replyMessage: {} }]
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 })
    return Buffer.from(res.data.result.image, 'base64')
}

// WTP conversacion iPhone
const createWTP = async (text, name) => {
    const canvas = createCanvas(512, 512)
    const ctx = canvas.getContext('2d')
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})

    // Fondo
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 512)

    // Status bar
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 0, 512, 35)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(time, 256, 23)

    // Nav bar
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 50, 512, 45)
    ctx.fillStyle = '#007aff'
    ctx.font = '16px Arial'
    ctx.fillText('< Back', 50, 78)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 17px Arial'
    ctx.fillText(name, 256, 78)

    // Linea
    ctx.strokeStyle = '#c8c8c8'
    ctx.beginPath()
    ctx.moveTo(0, 95)
    ctx.lineTo(512, 95)
    ctx.stroke()

    // Burbuja mensaje
    const words = text.split(' ')
    let lines = []
    let current = ''
    const maxW = 280
    ctx.font = '16px Arial'
    
    for (let w of words) {
        const test = current + w + ' '
        if (ctx.measureText(test).width > maxW && current !== '') {
            lines.push(current)
            current = w + ' '
        } else {
            current = test
        }
    }
    lines.push(current)

    const pad = 14
    const lh = 22
    const bh = lines.length * lh + pad * 2
    const bw = Math.min(maxW + pad * 2, 380)
    const bx = 512 - bw - 18
    const by = 130

    // Burbuja verde iOS
    ctx.fillStyle = '#34c759'
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, 18)
    ctx.fill()

    // Texto
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    let ty = by + pad + 16
    for (let line of lines) {
        ctx.fillText(line.trim(), bx + pad, ty)
        ty += lh
    }

    // Hora mensaje
    ctx.fillStyle = '#8e8e93'
    ctx.font = '11px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(time, bx + bw - 8, by + bh + 14)

    return canvas.encode('png')
}

// Error helper
const errMsg = (conn, m, emoji, msg, usedPrefix, rcanal) => {
    return conn.sendMessage(m.chat, {
        text: `> . ﹡ ﹟ ${emoji} ׄ ⬭ *¡ᴇʀʀᴏʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜❌* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴇʀʀᴏʀ* :: ${msg}\nׅㅤ𓏸𓈒ㅤׄ *ʀᴇᴘᴏʀᴛ* :: \`${usedPrefix}report\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`,
        contextInfo: { ...rcanal }
    }, { quoted: m })
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
    const rcanal = await getRcanal()
    const userId = m.sender
    const packstickers = global.db?.data?.users?.[userId] || {}
    const texto1 = packstickers.text1 || global.packsticker || 'ᴀsᴛᴀ-ʙᴏᴛ'
    const texto2 = packstickers.text2 || global.packsticker2 || 'ғᴇʀɴᴀɴᴅᴏ'

    try {
        switch (command) {

            case 's':
            case 'sticker':
            case 'stiker': {
                const quoted = m.quoted || m
                const mime = (quoted.msg || quoted).mimetype || ''
                if (!mime) return errMsg(conn, m, '🖼️', 'ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴᴀ ɪᴍᴀɢᴇɴ ᴏ ᴠɪᴅᴇᴏ', usedPrefix, rcanal)

                const isImg = mime.startsWith('image/')
                const isVid = mime.startsWith('video/')
                if (!isImg && !isVid) return errMsg(conn, m, '🖼️', 'ꜱᴏʟᴏ ɪᴍᴀɢᴇɴᴇꜱ ᴏ ᴠɪᴅᴇᴏꜱ', usedPrefix, rcanal)

                await m.react('🕒')
                const buffer = await quoted.download()
                if (!buffer) return errMsg(conn, m, '🖼️', 'ɴᴏ ꜱᴇ ᴘᴜᴅᴏ ᴅᴇꜱᴄᴀʀɢᴀʀ', usedPrefix, rcanal)

                const sticker = await toWebp(buffer)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'img':
            case 'toimg': {
                if (!m.quoted) return errMsg(conn, m, '🖼️', 'ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ', usedPrefix, rcanal)
                const mime = (m.quoted.msg || m.quoted).mimetype || ''
                if (!mime.includes('webp')) return errMsg(conn, m, '🖼️', 'ᴅᴇʙᴇ ꜱᴇʀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ', usedPrefix, rcanal)

                await m.react('🕒')
                const buffer = await m.quoted.download()
                const png = await webpToPng(buffer)
                await conn.sendMessage(m.chat, { image: png, caption: '✅ *ꜱᴛɪᴄᴋᴇʀ ᴄᴏɴᴠᴇʀᴛɪᴅᴏ*' }, { quoted: m })
                await m.react('✅')
                break
            }

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
                const sticker = await toWebp(buffer)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'bratv': {
                text = m.quoted?.text || text
                if (!text) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 🖤 ׄ ⬭ *¡ʙʀᴀᴛ ᴀɴɪᴍᴀᴅᴏ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🖤* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#bratv (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#bratv hola mundo\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                await m.react('🕒')
                const buffer = await fetchBrat(text, true)
                const sticker = await toWebp(buffer)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'wtp': {
                text = m.quoted?.text || text || args.join(' ')
                if (!text) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 📱 ׄ ⬭ *¡ᴡʜᴀᴛꜱᴀᴘᴘ ᴄᴏɴᴠᴇʀꜱᴀᴛɪᴏɴ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜📱* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#wtp (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#wtp hola como estás\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                await m.react('🕒')
                const name = await conn.getName(m.sender).catch(() => 'Usuario')
                const png = await createWTP(text, name)
                const sticker = await toWebp(png)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'emojimix': {
                if (!args[0]) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 🎨 ׄ ⬭ *¡ᴇᴍᴏᴊɪ ᴍɪx!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🎨* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#emojimix emoji1+emoji2\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#emojimix 👻+👀\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                let [e1, e2] = text.split(/\+/).map(e => e.trim())
                if (!e2) [e1, e2] = [args[0], args[1] || args[0]]
                if (!e1 || !e2) return errMsg(conn, m, '🎨', 'ᴅᴇʙᴇꜱ ᴘʀᴏᴘᴏʀᴄɪᴏɴᴀʀ 2 ᴇᴍᴏᴊɪꜱ', usedPrefix, rcanal)

                await m.react('🕒')
                const url = await fetchEmojimix(e1, e2)
                const img = await (await fetch(url)).buffer()
                const sticker = await toWebp(img)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'qc': {
                let final = args.join(' ') || m.quoted?.text
                if (!final) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 💬 ׄ ⬭ *¡ǫᴜᴏᴛᴇ ꜱᴛɪᴄᴋᴇʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜💬* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: \`#qc (texto)\`\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊᴇᴍᴘʟᴏ* :: \`#qc hola\`\nׅㅤ𓏸𓈒ㅤׄ *ᴍáx* :: 30 ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                const target = m.quoted ? m.quoted.sender : m.sender
                const pp = await conn.profilePictureUrl(target).catch(() => 'https://telegra.ph/file/24fa902ead26340f3df2c.png')
                const nombre = await conn.getName(target).catch(() => target.split('@')[0])
                const frase = final.replace(new RegExp(`@${target.split('@')[0]}`, 'g'), '')

                if (frase.length > 30) {
                    await m.react('✖️')
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ 💬 ׄ ⬭ *¡ᴇʀʀᴏʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜❌* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴇʀʀᴏʀ* :: ᴍáx. 30 ᴄᴀʀᴀᴄᴛᴇʀᴇꜱ\nׅㅤ𓏸𓈒ㅤׄ *ᴛᴜ ᴛᴇxᴛᴏ* :: ${frase.length}\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                await m.react('🕒')
                const buffer = await fetchQC(frase, nombre, pp)
                const sticker = await toWebp(buffer)
                await conn.sendMessage(m.chat, { sticker, packname: texto1, author: texto2 }, { quoted: m })
                await m.react('✅')
                break
            }

            case 'take':
            case 'wm': {
                if (!m.quoted) {
                    return conn.sendMessage(m.chat, {
                        text: `> . ﹡ ﹟ ✏️ ׄ ⬭ *¡ʀᴇɴᴏᴍʙʀᴀʀ ꜱᴛɪᴄᴋᴇʀ!*\n\n*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜✏️* ㅤ֢ㅤ⸱ㅤᯭִ*\n\nׅㅤ𓏸𓈒ㅤׄ *ᴜsᴏ* :: ʀᴇꜱᴘᴏɴᴅᴇ ᴀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ\nׅㅤ𓏸𓈒ㅤׄ *ᴇᴊ* :: \`#take Pack | Autor\`\n\n> . ﹡ ﹟ ⚡ ׄ ⬭ *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ*`.trim(),
                        contextInfo: { ...rcanal }
                    }, { quoted: m })
                }
                const mime = (m.quoted.msg || m.quoted).mimetype || ''
                if (!mime.includes('webp')) return errMsg(conn, m, '✏️', 'ᴅᴇʙᴇ ꜱᴇʀ ᴜɴ ꜱᴛɪᴄᴋᴇʀ', usedPrefix, rcanal)

                await m.react('🕒')
                const buffer = await m.quoted.download()
                const parts = text.split(/[\u2022|•]/).map(p => p.trim())
                const pack = parts[0] || texto1
                const author = parts[1] || texto2
                const sticker = await toWebp(buffer)
                await conn.sendMessage(m.chat, { sticker, packname: pack, author }, { quoted: m })
                await m.react('✅')
                break
            }
        }
    } catch (e) {
        console.error(e)
        await m.react('✖️')
        errMsg(conn, m, '⚠️', e.message || 'ᴇʀʀᴏʀ ᴅᴇꜱᴄᴏɴᴏᴄɪᴅᴏ', usedPrefix, rcanal)
    }
}

handler.tags = ['tools']
handler.help = ['s', 'sticker', 'stiker', 'img', 'toimg', 'brat', 'bratv', 'wtp', 'emojimix', 'qc', 'take', 'wm']
handler.command = ['s', 'sticker', 'stiker', 'img', 'toimg', 'brat', 'bratv', 'wtp', 'emojimix', 'qc', 'take', 'wm']

export default handler
