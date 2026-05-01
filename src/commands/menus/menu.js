import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoMenu = subConfig.logos?.menu || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║  🤖 *${botName}*  ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 ¡Hola @${userId}!\n\n`
    
    txt += `📂 *INFORMACIÓN*\n`
    txt += `  ${prefix}ping - Velocidad del bot\n`
    txt += `  ${prefix}info - Información del bot\n`
    txt += `  ${prefix}perfil - Tu perfil completo\n\n`

    txt += `💰 *ECONOMÍA*\n`
    txt += `  ${prefix}menu-economia - Menú de economía\n\n`

    txt += `🎮 *JUEGOS Y RPG*\n`
    txt += `  ${prefix}menu-gacha - Menú Gacha\n`
    txt += `  ${prefix}menu-rpg - Menú RPG\n\n`

    txt += `👥 *GRUPOS*\n`
    txt += `  ${prefix}menu-grupo - Menú de grupo\n\n`

    txt += `🔧 *HERRAMIENTAS*\n`
    txt += `  ${prefix}menudes - Menú descargas\n`
    txt += `  ${prefix}sticker - Crear sticker\n\n`

    txt += `📝 *${prefix}menu* - Menú principal\n`
    txt += `🌐 Panel: /dashboard`

    try {
        if (logoMenu && logoMenu.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoMenu }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else if (global.icono && global.icono.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: global.icono }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['menu', 'help', 'comandos']
handler.tags = ['info', 'main']
handler.command = ['menu', 'help', 'comandos', 'ayuda']

export default handler
