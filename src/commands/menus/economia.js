let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    
    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoEco = subConfig.logos?.economic || subConfig.logos?.grupo || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗\n`
    txt += `║    💰 *ECONOMÍA*    ║\n`
    txt += `╚══════════════════════╝\n\n`
    txt += `👋 Hola @${userId}\n\n`
    
    txt += `💵 *DINERO Y BANCO*\n`
    txt += `  ${prefix}balance - Ver tu dinero y exp\n`
    txt += `  ${prefix}deposit <cantidad/all> - Guardar en banco\n`
    txt += `  ${prefix}withdraw <cantidad/all> - Sacar del banco\n`
    txt += `  ${prefix}pay @user <cantidad> - Transferir dinero\n\n`

    txt += `💼 *TRABAJOS Y GANANCIAS*\n`
    txt += `  ${prefix}work - Trabajar (15m)\n`
    txt += `  ${prefix}slut - Trabajar como scort (20m)\n`
    txt += `  ${prefix}daily - Recompensa diaria (24h)\n\n`

    txt += `🦹 *CRIMINALIDAD*\n`
    txt += `  ${prefix}rob @user - Robar a alguien (45m)\n\n`

    txt += `👤 *PERFIL Y RANKING*\n`
    txt += `  ${prefix}perfil - Ver tus estadísticas y nivel\n`
    txt += `  ${prefix}leaderboard [money/exp] - Ver el top 10 global\n\n`

    txt += `🏪 *TIENDA (Próximamente)*\n`
    txt += `  ${prefix}tienda - Ver artículos\n`
    txt += `  ${prefix}comprar <item> - Comprar\n\n`

    txt += `📝 *${prefix}menu* - Menú principal`

    try {
        if (logoEco && logoEco.startsWith('http')) {
            await conn.sendMessage(m.chat, { image: { url: logoEco }, caption: txt, mentions: [userJid] }, { quoted: m })
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
