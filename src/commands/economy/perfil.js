import { getOrCreateUser, formatMoney } from '../../../lib/users.js'
import { getRango } from '../../../lib/economy/stats.js'
import { getEquippedItems } from '../../../lib/economy/inventory.js'
import { getItem } from '../../../lib/economy/items.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)
    const rango = getRango(user.level || 1)
    const equipped = getEquippedItems(userId)

    const expNeeded = (user.level || 1) * 150
    const expCurrent = user.exp || 0
    const expPct = Math.min(expCurrent / expNeeded, 1)
    const filled = Math.round(expPct * 10)
    const empty = 10 - filled
    const expBar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`

    let txt = `👤 *PERFIL DE ${user.profile?.displayName || user.username}*

`

    txt += `${rango.emoji} *${rango.nombre}*
`
    txt += `📈 Nivel: *${user.level || 1}*
`
    txt += `✨ EXP: ${expBar} ${expCurrent}/${expNeeded}

`

    txt += `💰 *ECONOMIA*
`
    txt += `💵 Dinero: ${formatMoney(user.money || 0)}
`
    txt += `🏦 Banco: ${formatMoney(user.bank || 0)}
`
    txt += `💎 Total: ${formatMoney((user.money || 0) + (user.bank || 0))}

`

    const equipadosList = Object.values(equipped)
    if (equipadosList.length > 0) {
        txt += `⚔️ *EQUIPADO:*
`
        for (const data of equipadosList) {
            const item = getItem(data.id)
            const dur = data.durabilidad ? ` [${data.durabilidad}⚡]` : ''
            txt += `  ${item?.emoji || '•'} ${item?.nombre || data.id}${dur}
`
        }
        txt += `
`
    }

    if (user.titulos && user.titulos.length > 0) {
        txt += `🏅 *TITULOS:* ${user.titulos.join(', ')}

`
    }

    const stats = user.stats || {}
    txt += `📊 *ACTIVIDADES*
`
    txt += `⛏️ Minas: ${stats.minar?.count || 0} | 🎣 Pescas: ${stats.pescar?.count || 0}
`
    txt += `🏹 Cazas: ${stats.cazar?.count || 0} | 🌿 Recolectas: ${stats.recolectar?.count || 0}
`
    txt += `💼 Trabajos: ${stats.trabajar?.count || 0} | 🔨 Crafts: ${stats.craftear?.count || 0}
`
    txt += `💵 Ventas: ${stats.vender?.count || 0} | ⚔️ Combates: ${(stats.combate?.wins || 0) + (stats.combate?.losses || 0)}

`

    const invCount = Object.keys(user.inventory || {}).length
    txt += `🎒 *Inventario:* ${invCount} items diferentes
`
    txt += `💡 Usa #inventario para ver detalles`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['perfil', 'profile']
handler.tags = ['economy', 'rpg']
handler.command = ['perfil', 'profile', 'stats', 'estadisticas']
export default handler
