let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')

    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || 'Asta Bot'
    const logoEco = subConfig.logos?.economic || subConfig.logos?.grupo || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    let txt = `╔══════════════════════╗
`
    txt += `║    💰 *ECONOMÍA RPG*    ║
`
    txt += `╚══════════════════════╝

`
    txt += `👋 Hola @${userId}

`

    txt += `💵 *DINERO Y BANCO*
`
    txt += `  ${prefix}balance - Ver tu dinero y exp
`
    txt += `  ${prefix}deposit <cantidad/all> - Guardar en banco
`
    txt += `  ${prefix}withdraw <cantidad/all> - Sacar del banco
`
    txt += `  ${prefix}pay @user <cantidad> - Transferir dinero

`

    txt += `💼 *TRABAJOS Y GANANCIAS*
`
    txt += `  ${prefix}work - Trabajar (10m)
`
    txt += `  ${prefix}slut - Trabajar como scort (20m)
`
    txt += `  ${prefix}daily - Recompensa diaria (24h)

`

    txt += `⛏️ *ACTIVIDADES RPG*
`
    txt += `  ${prefix}minar - Minar minerales (5m)
`
    txt += `  ${prefix}pescar - Pescar peces (5m)
`
    txt += `  ${prefix}cazar [animal] - Cazar animales (8m)
`
    txt += `  ${prefix}recolectar - Recolectar materiales (3m)

`

    txt += `🔨 *CRAFT Y GESTIÓN*
`
    txt += `  ${prefix}craft - Ver recetas de crafteo
`
    txt += `  ${prefix}craft <item> - Craftear un item
`
    txt += `  ${prefix}inv - Ver inventario y equipamiento
`
    txt += `  ${prefix}inv equipar <item> - Equipar item
`
    txt += `  ${prefix}inv desequipar <item> - Desequipar item
`
    txt += `  ${prefix}vender - Ver items para vender
`
    txt += `  ${prefix}vender <item> [cantidad] - Vender items

`

    txt += `📋 *PROGRESIÓN*
`
    txt += `  ${prefix}perfil - Ver perfil RPG completo
`
    txt += `  ${prefix}misiones - Ver misiones activas
`
    txt += `  ${prefix}misiones <id> - Reclamar recompensa
`
    txt += `  ${prefix}leaderboard [money/exp] - Ranking global

`

    txt += `👹 *COMBATE Y JEFES*
`
    txt += `  ${prefix}boss - Ver lista de jefes
`
    txt += `  ${prefix}boss <nombre> - Desafiar jefe (1h)

`

    txt += `🦹 *CRIMINALIDAD*
`
    txt += `  ${prefix}rob @user - Robar a alguien (45m)

`

    txt += `🎰 *CASINO*
`
    txt += `  ${prefix}juegos - Menú de juegos
`
    txt += `  ${prefix}ruleta <cantidad> - Ruleta rusa (2x)
`
    txt += `  ${prefix}dados <cantidad> <1-6> - Dados (5x)
`
    txt += `  ${prefix}blackjack <cantidad> - Blackjack (2.5x)
`
    txt += `  ${prefix}slots <cantidad> - Tragamonedas (hasta 50x)
`
    txt += `  ${prefix}caballos <cantidad> <1-5> - Carreras (hasta 8x)

`

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
