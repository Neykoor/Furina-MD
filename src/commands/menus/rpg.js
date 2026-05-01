import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoRPG = subConfig.logos?.grupo || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║    ⚔️ *RPG MENÚ*    ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `⚔️ *AVENTURA*\n`
    txt += `  ${prefix}aventura - Explorar\n`
    txt += `  ${prefix}minar - Minar recursos\n`
    txt += `  ${prefix}pescar - Pescar\n`
    txt += `  ${prefix}cazar - Cazar monstruos\n\n`

    txt += `🏰 *MAZMORRA*\n`
    txt += `  ${prefix}mazmorra - Entrar\n`
    txt += `  ${prefix}boss - Pelear con jefe\n`
    txt += `  ${prefix}raid - Raid en grupo\n\n`

    txt += `👤 *PERSONAJE*\n`
    txt += `  ${prefix}stats - Tus estadísticas\n`
    txt += `  ${prefix}skills - Tus habilidades\n`
    txt += `  ${prefix}equipo - Tu equipo\n`
    txt += `  ${prefix}clase - Cambiar clase\n\n`

    txt += `🏪 *TIENDA RPG*\n`
    txt += `  ${prefix}tiendarpg - Ver armas\n`
    txt += `  ${prefix}comprarrpg <item> - Comprar\n`
    txt += `  ${prefix}venderrpg <item> - Vender\n`
    txt += `  ${prefix}mejorar <item> - Mejorar equipo\n\n`

    txt += `🏆 *RANKING*\n`
    txt += `  ${prefix}toprpg - Top jugadores\n`
    txt += `  ${prefix}topclan - Top clanes\n\n`

    txt += `📝 *${prefix}menu* - Menú principal`

    try {
        if (logoRPG && logoRPG.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoRPG }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['menurpg', 'rpgmenu']
handler.tags = ['rpg', 'main']
handler.command = ['menurpg', 'menu-rpg', 'rpgmenu', 'rpg']

export default handler
