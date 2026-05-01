import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoGacha = subConfig.logos?.gacha || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║    🎮 *GACHA RPG*   ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `🎰 *GACHA Y COLECCIÓN*\n`
    txt += `  ${prefix}gacha - Tirar del gacha\n`
    txt += `  ${prefix}gacha10 - 10 tiros\n`
    txt += `  ${prefix}inventario - Tus personajes\n`
    txt += `  ${prefix}coleccion - Ver colección\n\n`

    txt += `⭐ *PERSONAJES*\n`
    txt += `  ${prefix}perfilpj <nombre> - Ver personaje\n`
    txt += `  ${prefix}subir <nombre> - Subir de nivel\n`
    txt += `  ${prefix}evolucion <nombre> - Evolucionar\n`
    txt += `  ${prefix}vender <nombre> - Vender personaje\n\n`

    txt += `💰 *MERCADO*\n`
    txt += `  ${prefix}mercado - Ver mercado\n`
    txt += `  ${prefix}vendermercado <pj> <precio> - Publicar\n`
    txt += `  ${prefix}comprarmercado <id> - Comprar\n\n`

    txt += `🏆 *RANKING*\n`
    txt += `  ${prefix}topgacha - Top coleccionistas\n\n`

    txt += `📝 *${prefix}menu* - Menú principal`

    try {
        if (logoGacha && logoGacha.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoGacha }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['menugacha', 'gacha']
handler.tags = ['gacha', 'main']
handler.command = ['menugacha', 'menu-gacha', 'gachamenu']

export default handler
