import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command, isOwner }) => {
    if (!isOwner) return
    
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoGeneral = subConfig.logos?.general || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║  👑 *OWNER MENÚ*   ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `🤖 *BOTS*\n`
    txt += `  ${prefix}serbot - Crear sub-bot\n`
    txt += `  ${prefix}listbot - Lista de bots\n`
    txt += `  ${prefix}delbot <id> - Eliminar bot\n`
    txt += `  ${prefix}stopbot <id> - Detener bot\n\n`

    txt += `👥 *USUARIOS*\n`
    txt += `  ${prefix}addprem @user - Premium\n`
    txt += `  ${prefix}delprem @user - Quitar premium\n`
    txt += `  ${prefix}listprem - Lista premium\n`
    txt += `  ${prefix}bloquear @user - Bloquear\n`
    txt += `  ${prefix}desbloquear @user - Desbloquear\n\n`

    txt += `💰 *ECONOMÍA*\n`
    txt += `  ${prefix}addmoney @user <monto>\n`
    txt += `  ${prefix}delmoney @user <monto>\n`
    txt += `  ${prefix}setmoney @user <monto>\n\n`

    txt += `📢 *DIFUSIÓN*\n`
    txt += `  ${prefix}bc <texto> - Difusión\n`
    txt += `  ${prefix}bcaudio <audio> - Difusión audio\n\n`

    txt += `⚙️ *SISTEMA*\n`
    txt += `  ${prefix}update - Actualizar bot\n`
    txt += `  ${prefix}restart - Reiniciar\n`
    txt += `  ${prefix}backup - Respaldo\n\n`

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

handler.help = ['menuowner', 'ownermenu']
handler.tags = ['owner', 'main']
handler.command = ['menuowner', 'menu-owner', 'ownermenu']
handler.owner = true

export default handler
