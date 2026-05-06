import { getOrCreateUser, formatMoney } from '../../../lib/users.js'
import { getItem, RAREZA_INFO } from '../../../lib/economy/items.js'
import { getEquippedItems, getEquipmentBonus, unequipItem, equipItem } from '../../../lib/economy/inventory.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    // Si hay argumentos, intentar equipar/desequipar
    if (args[0]) {
        const action = args[0].toLowerCase()
        const itemName = args.slice(1).join(' ').toLowerCase()

        if (action === 'equipar' || action === 'eq') {
            const itemId = Object.keys(user.inventory || {}).find(id => {
                const item = getItem(id)
                return item && (item.nombre.toLowerCase().includes(itemName) || id === itemName)
            })

            if (!itemId) return conn.reply(m.chat, `❌ No tienes ese item en tu inventario.`, m)

            const result = equipItem(userId, itemId)
            if (!result.success) return conn.reply(m.chat, `❌ ${result.error}`, m)

            let txt = `⚔️ *ITEM EQUIPADO*\n\n`
            txt += `${result.item.emoji} *${result.item.nombre}*\n`
            if (result.previous) {
                const prev = getItem(result.previous)
                txt += `\n📤 Desequipado: ${prev?.emoji || ''} ${prev?.nombre || result.previous}`
            }
            return conn.reply(m.chat, txt, m)
        }

        if (action === 'desequipar' || action === 'uneq') {
            const itemId = Object.keys(user.inventory || {}).find(id => {
                const item = getItem(id)
                return item && (item.nombre.toLowerCase().includes(itemName) || id === itemName)
            })

            if (!itemId) return conn.reply(m.chat, `❌ No tienes ese item.`, m)

            unequipItem(userId, itemId)
            const item = getItem(itemId)
            return conn.reply(m.chat, `📤 *DESEQUIPADO*\n\n${item?.emoji || ''} ${item?.nombre || itemId}`, m)
        }
    }

    // Mostrar inventario completo
    const inventory = user.inventory || {}
    const equipped = getEquippedItems(userId)
    const bonuses = getEquipmentBonus(userId)

    let txt = `🎒 *INVENTARIO DE ${user.profile?.displayName || user.username}*\n\n`

    // Info del jugador
    txt += `📈 Nivel: ${user.level || 1} | ✨ EXP: ${user.exp || 0}/${(user.level || 1) * 150}\n`
    txt += `💰 Dinero: ${formatMoney(user.money || 0)} | 🏦 Banco: ${formatMoney(user.bank || 0)}\n\n`

    // Items equipados
    const equipadosList = Object.values(equipped)
    if (equipadosList.length > 0) {
        txt += `⚔️ *EQUIPADO:*\n`
        for (const data of equipadosList) {
            const item = getItem(data.id)
            const dur = data.durabilidad ? ` [${data.durabilidad}⚡]` : ''
            txt += `  ${item?.emoji || '•'} *${item?.nombre || data.id}*${dur}\n`
        }

        // Mostrar bonus totales
        txt += `\n📊 *Bonus de equipamiento:*\n`
        if (bonuses.mineria > 1) txt += `  ⛏️ Minería: x${bonuses.mineria.toFixed(2)}\n`
        if (bonuses.pesca > 1) txt += `  🎣 Pesca: x${bonuses.pesca.toFixed(2)}\n`
        if (bonuses.caza > 1) txt += `  🏹 Caza: x${bonuses.caza.toFixed(2)}\n`
        if (bonuses.luck > 1) txt += `  🍀 Suerte: x${bonuses.luck.toFixed(2)}\n`
        if (bonuses.exp_bonus > 1) txt += `  ✨ EXP: x${bonuses.exp_bonus.toFixed(2)}\n`
        if (bonuses.defensa > 0) txt += `  🛡️ Defensa: +${bonuses.defensa}\n`
        if (bonuses.daño > 0) txt += `  ⚔️ Daño: +${bonuses.daño}\n`
        txt += `\n`
    }

    // Items por categoría
    const cats = {
        herramienta: '🔧 Herramientas',
        arma: '⚔️ Armas',
        armadura: '🛡️ Armaduras',
        accesorio: '💍 Accesorios',
        consumible: '🧪 Consumibles',
        mineral: '⛏️ Minerales',
        pez: '🐟 Peces',
        animal: '🏹 Caza',
        material: '🌿 Materiales'
    }

    const porCat = {}
    for (const [id, data] of Object.entries(inventory)) {
        if (data.equipado) continue
        const item = getItem(id)
        if (!item) continue
        const cat = item.tipo || 'material'
        if (!porCat[cat]) porCat[cat] = []
        porCat[cat].push({ id, ...data, item })
    }

    for (const [cat, items] of Object.entries(porCat)) {
        if (items.length === 0) continue
        txt += `${cats[cat] || cat}:
`
        for (const data of items) {
            const dur = data.durabilidad ? ` [${data.durabilidad}⚡]` : ''
            const rareza = data.item.rareza ? ` (${RAREZA_INFO[data.item.rareza]?.nombre || data.item.rareza})` : ''
            txt += `  ${data.item.emoji} ${data.item.nombre} x${data.cantidad}${dur}${rareza}\n`
        }
        txt += `\n`
    }

    if (Object.keys(inventory).length === 0) {
        txt += `📭 Tu inventario está vacío.\n`
        txt += `Usa #minar, #pescar, #cazar o #recolectar para obtener items.`
    }

    txt += `\n💡 *Comandos:*\n`
    txt += `#inv equipar <item> - Equipar\n`
    txt += `#inv desequipar <item> - Desequipar`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['inventario', 'inv', 'inventory']
handler.tags = ['economy', 'rpg']
handler.command = ['inventario', 'inv', 'inventory', 'mochila']
export default handler
