import { getOrCreateUser, formatMoney } from '../../../lib/users.js'
import { getRango } from '../../../lib/economy/stats.js'
import { getEquippedItems } from '../../../lib/economy/inventory.js'
import { getItem } from '../../../lib/economy/items.js'
import { getFamilyData, getFamilyStats, getRelationLabel } from '../../../lib/family.js'

let handler = async (m, { conn }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)
        const rango = getRango(user.level || 1)
        const equipped = getEquippedItems(userId)
        const family = getFamilyData(userId)
        const famStats = getFamilyStats(userId)

        const expNeeded = (user.level || 1) * 150
        const expCurrent = user.exp || 0
        const expPct = Math.min(expCurrent / expNeeded, 1)
        const filled = Math.round(expPct * 10)
        const empty = 10 - filled
        const expBar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`

        let txt = `👤 *PERFIL DE ${user.profile?.displayName || user.username}*\n\n`

        txt += `${rango.emoji} *${rango.nombre}*\n`
        txt += `📈 Nivel: *${user.level || 1}*\n`
        txt += `✨ EXP: ${expBar} ${expCurrent}/${expNeeded}\n\n`

        if (family.spouse) {
            const spouse = getOrCreateUser(family.spouse)
            const since = family.spouseSince ? new Date(family.spouseSince).toLocaleDateString() : ''
            txt += `💑 *MATRIMONIO*\n`
            txt += `   Casado con: @${family.spouse}\n`
            txt += `   (${spouse.profile?.displayName || spouse.username})\n`
            if (since) txt += `   Desde: ${since}\n`
            txt += `\n`
        }

        if (family.children.length > 0 || family.parents.length > 0) {
            txt += `🌳 *FAMILIA*\n`

            if (family.children.length > 0) {
                txt += `   👶 Hijos (${family.children.length}):\n`
                for (const childId of family.children.slice(0, 3)) {
                    const child = getOrCreateUser(childId)
                    txt += `      • @${childId} - ${child.profile?.displayName || child.username}\n`
                }
                if (family.children.length > 3) txt += `      ... y ${family.children.length - 3} más\n`
            }

            if (family.parents.length > 0) {
                txt += `   👴 Padres (${family.parents.length}):\n`
                for (const parentId of family.parents) {
                    const parent = getOrCreateUser(parentId)
                    txt += `      • @${parentId} - ${parent.profile?.displayName || parent.username}\n`
                }
            }

            const descendants = famStats.descendants
            const ancestors = famStats.ancestors
            if (descendants > family.children.length || ancestors > family.parents.length) {
                txt += `\n   🧬 Generación: ${famStats.generation}\n`
                txt += `   👨‍👩‍👧‍👦 Descendientes totales: ${descendants}\n`
                txt += `   👆 Ancestros totales: ${ancestors}\n`
            }

            txt += `\n`
        }

        txt += `💰 *ECONOMIA*\n`
        txt += `💵 Dinero: ${formatMoney(user.money || 0)}\n`
        txt += `🏦 Banco: ${formatMoney(user.bank || 0)}\n`
        txt += `💎 Total: ${formatMoney((user.money || 0) + (user.bank || 0))}\n\n`

        const equipadosList = Object.values(equipped)
        if (equipadosList.length > 0) {
            txt += `⚔️ *EQUIPADO:*\n`
            for (const data of equipadosList) {
                const item = getItem(data.id)
                const dur = data.durabilidad ? ` [${data.durabilidad}⚡]` : ''
                txt += `  ${item?.emoji || '•'} ${item?.nombre || data.id}${dur}\n`
            }
            txt += `\n`
        }

        if (user.titulos && user.titulos.length > 0) {
            txt += `🏅 *TITULOS:* ${user.titulos.join(', ')}\n\n`
        }

        const stats = user.stats || {}
        txt += `📊 *ACTIVIDADES*\n`
        txt += `⛏️ Minas: ${stats.minar?.count || 0} | 🎣 Pescas: ${stats.pescar?.count || 0}\n`
        txt += `🏹 Cazas: ${stats.cazar?.count || 0} | 🌿 Recolectas: ${stats.recolectar?.count || 0}\n`
        txt += `💼 Trabajos: ${stats.trabajar?.count || 0} | 🔨 Crafts: ${stats.craftear?.count || 0}\n`
        txt += `💵 Ventas: ${stats.vender?.count || 0} | ⚔️ Combates: ${(stats.combate?.wins || 0) + (stats.combate?.losses || 0)}\n\n`

        const invCount = Object.keys(user.inventory || {}).length
        txt += `🎒 *Inventario:* ${invCount} items diferentes\n`
        txt += `💡 Usa #inventario para ver detalles`

        const mentions = []
        if (family.spouse) mentions.push(family.spouse + '@s.whatsapp.net')
        for (const childId of family.children.slice(0, 3)) mentions.push(childId + '@s.whatsapp.net')
        for (const parentId of family.parents) mentions.push(parentId + '@s.whatsapp.net')

        await conn.sendMessage(m.chat, { text: txt, mentions }, { quoted: m })

    } catch (error) {
        console.error('Error en perfil:', error)
        await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['perfil', 'profile']
handler.tags = ['economy', 'rpg']
handler.command = ['perfil', 'profile', 'stats', 'estadisticas']

export default handler
