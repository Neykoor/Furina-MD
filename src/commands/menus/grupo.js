import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command, isAdmin, isBotAdmin }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    const isGroup = m.chat.endsWith('@g.us')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoGrupo = subConfig.logos?.grupo || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║   👥 *MENÚ GRUPO*   ║\n`
    txt += `╚══════════════════════╝\n\n`

    if (!isGroup) {
        txt += `❌ Este menú solo está disponible en grupos.\n`
        txt += `Usa *${prefix}menu* para ver comandos disponibles.`
        return conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }

    txt += `👋 @${userId}\n\n`
    
    txt += `🛡️ *ADMINISTRACIÓN*\n`
    txt += `  ${prefix}antilink - Configurar anti-link\n`
    txt += `  ${prefix}welcome - Configurar bienvenida\n`
    txt += `  ${prefix}ban @user - Expulsar\n`
    txt += `  ${prefix}promote @user - Dar admin\n`
    txt += `  ${prefix}demote @user - Quitar admin\n`
    txt += `  ${prefix}add @user - Agregar miembro\n`
    txt += `  ${prefix}kick @user - Expulsar\n`
    txt += `  ${prefix}mute @user - Silenciar\n`
    txt += `  ${prefix}unmute @user - Quitar silencio\n\n`

    txt += `📋 *INFORMACIÓN DEL GRUPO*\n`
    txt += `  ${prefix}grupo - Info del grupo\n`
    txt += `  ${prefix}admins - Lista de admins\n`
    txt += `  ${prefix}link - Enlace del grupo\n\n`

    txt += `🎮 *JUEGOS EN GRUPO*\n`
    txt += `  ${prefix}topg - Top del grupo\n`
    txt += `  ${prefix}encuesta <texto> - Crear encuesta\n`
    txt += `  ${prefix}sorteo - Crear sorteo\n\n`

    txt += `⚙️ *CONFIGURACIÓN*\n`
    txt += `  ${prefix}bienvenida on/off - Activar welcome\n`
    txt += `  ${prefix}antilink on/off - Activar antilink\n`
    txt += `  ${prefix}antispam on/off - Activar antispam\n\n`

    txt += `📝 *${prefix}menu* - Menú principal`

    try {
        if (logoGrupo && logoGrupo.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoGrupo }, caption: txt, mentions: [userJid] }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['menugrupo', 'grupomenu']
handler.tags = ['grupo', 'main']
handler.command = ['menugrupo', 'menu-grupo', 'grupomenu', 'menugp']

export default handler
