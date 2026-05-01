import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoGacha = subConfig.logos?.gacha || subConfig.logos?.grupo || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║    💰 *ECONOMÍA*    ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 @${userId}\n\n`
    
    txt += `💵 *DINERO*\n`
    txt += `  ${prefix}balance - Ver tu dinero\n`
    txt += `  ${prefix}depositar <monto> - Guardar en banco\n`
    txt += `  ${prefix}retirar <monto> - Sacar del banco\n`
    txt += `  ${prefix}transferir @user <monto> - Enviar dinero\n\n`

    txt += `🎁 *RECOMPENSAS*\n`
    txt += `  ${prefix}diario - Recompensa diaria\n`
    txt += `  ${prefix}crimen - Cometer un crimen\n\n`

    txt += `👤 *PERFIL*\n`
    txt += `  ${prefix}perfil - Tu perfil\n`
    txt += `  ${prefix}nivel - Nivel y experiencia\n\n`

    txt += `🏪 *TIENDA*\n`
    txt += `  ${prefix}tienda - Ver artículos\n`
    txt += `  ${prefix}comprar <item> - Comprar\n\n`

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

handler.help = ['menueconomia', 'economia']
handler.tags = ['economy', 'main']
handler.command = ['menueconomia', 'economia', 'economy', 'menu-economia']

export default handler
