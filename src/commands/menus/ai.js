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
    txt += `║    🧠 *IA MENÚ*     ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `💬 *CHAT IA*\n`
    txt += `  ${prefix}ia <pregunta> - Preguntar a la IA\n`
    txt += `  ${prefix}gpt <texto> - ChatGPT\n`
    txt += `  ${prefix}dalle <texto> - Generar imagen\n\n`

    txt += `🖼️ *IMAGEN*\n`
    txt += `  ${prefix}imagen <texto> - Crear imagen IA\n`
    txt += `  ${prefix}animar <imagen> - Animar foto\n`
    txt += `  ${prefix}remini - Mejorar calidad\n\n`

    txt += `🔧 *HERRAMIENTAS IA*\n`
    txt += `  ${prefix}traducir <idioma> <texto>\n`
    txt += `  ${prefix}resumir <texto>\n`
    txt += `  ${prefix}corregir <texto>\n\n`

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

handler.help = ['menuia', 'iamenu']
handler.tags = ['ia', 'main']
handler.command = ['menuia', 'menu-ia', 'iamenu', 'ai']

export default handler
