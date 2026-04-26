import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoGeneral = subConfig.logos?.general || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║   ⬇️ *DESCARGAS*   ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `🎬 *VIDEO*\n`
    txt += `  ${prefix}ytmp4 <url> - YouTube video\n`
    txt += `  ${prefix}tiktok <url> - TikTok\n`
    txt += `  ${prefix}ig <url> - Instagram\n`
    txt += `  ${prefix}fb <url> - Facebook\n\n`

    txt += `🎵 *AUDIO*\n`
    txt += `  ${prefix}ytmp3 <url> - YouTube MP3\n`
    txt += `  ${prefix}play <nombre> - Buscar y descargar\n`
    txt += `  ${prefix}audio <url> - Audio genérico\n\n`

    txt += `🖼️ *IMAGEN*\n`
    txt += `  ${prefix}img <búsqueda> - Buscar imágenes\n`
    txt += `  ${prefix}wallpaper <tema> - Fondos\n\n`

    txt += `📝 *${prefix}menu* - Menú principal`

    try {
        if (logoGeneral && logoGeneral.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoGeneral }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['menudes', 'descargas']
handler.tags = ['descargas', 'main']
handler.command = ['menudes', 'menu-descargas', 'descargas', 'menudescargas']

export default handler
