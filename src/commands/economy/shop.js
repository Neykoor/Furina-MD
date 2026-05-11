import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'
import { getItem, TIENDA_ITEMS, MINERALES, PECES, MATERIALES, ANIMALES } from '../../../lib/economy/items.js'
import { addItem, removeItem, getInventory } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

const MULT_COMPRA = 1.5
const MULT_VENTA  = 0.4

// Cache calculado una sola vez al cargar el módulo
let _shopCache = null
function getShopItems() {
    if (_shopCache) return _shopCache
    const all = {}
    for (const [id, item] of Object.entries({ ...TIENDA_ITEMS, ...MINERALES, ...PECES, ...MATERIALES, ...ANIMALES })) {
        if (all[id]) continue
        const base = item.valor || item.precio_venta || 1
        all[id] = {
            ...item,
            compra: item.precio_compra ?? Math.floor(base * MULT_COMPRA),
            venta:  item.precio_venta  ?? Math.floor(base * MULT_VENTA)
        }
    }
    return (_shopCache = all)
}

function findItem(search, pool) {
    const s = search.toLowerCase()
    return Object.keys(pool).find(id => {
        const it = pool[id]
        return it.nombre?.toLowerCase().includes(s) || id === s
    })
}

const BONUS_LABELS = {
    mineria: '⛏️ Minería', pesca: '🎣 Pesca', caza: '🏹 Caza', talar: '🪓 Talar',
    luck: '🍀 Suerte', exp_bonus: '✨ EXP', defensa: '🛡️ Defensa', danio: '⚔️ Daño', charisma: '💎 Carisma'
}

const handler = async (m, { conn, args }) => {
    try {
        const userId  = m.sender.split('@')[0].replace(/\D/g, '')
        const user    = getOrCreateUser(userId)
        const shop    = getShopItems()

        // ── Sin argumentos: mostrar tienda ──────────────────────────
        if (!args || args.length === 0) {
            const inventory = getInventory(userId)
            let txt = `🏪 *TIENDA GENERAL*\n\n💰 Tu balance: ${formatMoney(user.money || 0)}\n\n`

            // Inventario vendible
            let hayVendibles = false
            for (const [id, data] of Object.entries(inventory)) {
                if (data.equipado) continue
                const item = getItem(id)
                if (!item) continue
                hayVendibles = true
                const vu = shop[id]?.venta ?? Math.floor((item.valor || 1) * MULT_VENTA)
                txt += `📦 ${item.emoji} *${item.nombre}* x${data.cantidad} — 💵 ${formatMoney(vu)}/u = ${formatMoney(vu * data.cantidad)}\n`
            }
            if (!hayVendibles) txt += `📭 No tienes items para vender.\n`

            txt += `\n📋 *Comandos:*\n`
            txt += `  #shop buy <item> <cantidad>\n  #shop sell <item> <cantidad/all>\n  #shop info <item>\n\n`

            txt += `⚔️ *EQUIPAMIENTO:*\n`
            for (const [id, item] of Object.entries(TIENDA_ITEMS))
                txt += `  ${item.emoji} *${item.nombre}* (Nv.${item.nivel || 1}) — ${formatMoney(shop[id]?.compra)}\n`

            for (const [cat, label, src] of [
                ['⛏️', 'MINERALES', MINERALES],
                ['🐟', 'PECES', PECES],
                ['🌿', 'MATERIALES', MATERIALES]
            ]) {
                txt += `\n${cat} *${label}:*\n`
                for (const item of Object.values(src).slice(0, 5))
                    txt += `  ${item.emoji} ${item.nombre} — 💵 ${formatMoney(shop[item.id]?.compra)}\n`
            }

            txt += `\n💡 Usa *#shop info <nombre>* para detalles`
            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        const action = args[0].toLowerCase()

        // ── Info ─────────────────────────────────────────────────────
        if (action === 'info') {
            const search = args.slice(1).join(' ')
            const itemId = findItem(search, shop)
            if (!itemId) return conn.sendMessage(m.chat, { text: `❌ Item no encontrado.` }, { quoted: m })

            const item = getItem(itemId) || shop[itemId]
            const have = getInventory(userId)[itemId]?.cantidad || 0

            let txt = `📦 *INFO — ${item.nombre}*\n\n`
            txt += `${item.emoji}  ID: ${item.id}  |  Rareza: ${item.rareza || 'común'}  |  Nv. ${item.nivel || 1}\n`
            txt += `💵 Compra: ${formatMoney(shop[itemId].compra)}  |  Venta: ${formatMoney(shop[itemId].venta)}\n`
            txt += `📦 Tienes: ${have}\n`
            if (item.bonus) {
                txt += `\n⚡ *Bonus:*\n`
                for (const [k, v] of Object.entries(item.bonus)) {
                    if (k === 'durabilidad') { txt += `  🔋 Durabilidad: ${v}\n`; continue }
                    txt += `  ${BONUS_LABELS[k] || k}: ${typeof v === 'number' && v < 10 ? `x${v.toFixed(1)}` : `+${v}`}\n`
                }
            }
            return conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        // ── Comprar ──────────────────────────────────────────────────
        if (action === 'buy' || action === 'comprar') {
            if (args.length < 3)
                return conn.sendMessage(m.chat, { text: `❌ Uso: *#shop buy <item> <cantidad>*` }, { quoted: m })

            const search   = args[1]
            const cantidad = parseInt(args[2])
            if (!cantidad || cantidad <= 0)
                return conn.sendMessage(m.chat, { text: `❌ Cantidad inválida.` }, { quoted: m })

            const itemId = findItem(search, shop)
            if (!itemId) return conn.sendMessage(m.chat, { text: `❌ Item no encontrado.` }, { quoted: m })

            const item       = getItem(itemId) || shop[itemId]
            const costo      = shop[itemId].compra * cantidad

            if ((user.money || 0) < costo)
                return conn.sendMessage(m.chat, { text: `❌ *Sin fondos*\n💰 Necesitas: ${formatMoney(costo)}\n💵 Tienes: ${formatMoney(user.money || 0)}` }, { quoted: m })

            addItem(userId, itemId, cantidad)
            updateUser(userId, { money: (user.money || 0) - costo })

            return conn.sendMessage(m.chat, {
                text: `🏪 *COMPRA EXITOSA*\n\n${item.emoji} *${item.nombre}* x${cantidad}\n💵 Total: *-${formatMoney(costo)}*\n\n💵 *Balance:* ${formatMoney((user.money || 0) - costo)}`
            }, { quoted: m })
        }

        // ── Vender ───────────────────────────────────────────────────
        if (action === 'sell' || action === 'vender') {
            if (args.length < 2)
                return conn.sendMessage(m.chat, { text: `❌ Uso: *#shop sell <item> <cantidad/all>*` }, { quoted: m })

            const lastArg  = args[args.length - 1]
            const isAll    = lastArg === 'all'
            const hasNum   = !isAll && !isNaN(lastArg) && args.length > 2
            const itemName = (isAll || hasNum) ? args.slice(1, -1).join(' ') : args.slice(1).join(' ')
            let cantidad   = isAll ? 'all' : (hasNum ? parseInt(lastArg) : 1)

            const search    = itemName.toLowerCase()
            const inventory = getInventory(userId)
            const itemId    = Object.keys(inventory).find(id => {
                const it = getItem(id)
                return it && (it.nombre.toLowerCase().includes(search) || id === search)
            })

            if (!itemId) return conn.sendMessage(m.chat, { text: `❌ No tienes ese item.` }, { quoted: m })

            const item = getItem(itemId)
            const have = inventory[itemId]?.cantidad || 0
            if (cantidad === 'all') cantidad = have
            if (!cantidad || cantidad <= 0)
                return conn.sendMessage(m.chat, { text: `❌ Cantidad inválida.` }, { quoted: m })
            if (have < cantidad)
                return conn.sendMessage(m.chat, { text: `❌ Tienes ${have}, quieres vender ${cantidad}.` }, { quoted: m })
            if (inventory[itemId].equipado && have <= cantidad)
                return conn.sendMessage(m.chat, { text: `❌ Desequipa el item primero.` }, { quoted: m })

            const ganancia = shop[itemId]?.venta * cantidad || Math.floor((item.valor || 1) * MULT_VENTA) * cantidad
            const ok = removeItem(userId, itemId, cantidad)
            if (!ok?.success) return conn.sendMessage(m.chat, { text: `❌ ${ok?.error || 'Error al vender'}` }, { quoted: m })

            updateUser(userId, { money: (user.money || 0) + ganancia })
            updateStats(userId, 'vender', { money: ganancia, cantidad })
            updateMissionProgress(userId, 'vender', cantidad)

            return conn.sendMessage(m.chat, {
                text: `🏪 *VENTA EXITOSA*\n\n${item.emoji} *${item.nombre}* x${cantidad}\n💵 Total: *+${formatMoney(ganancia)}*\n\n💵 *Balance:* ${formatMoney((user.money || 0) + ganancia)}`
            }, { quoted: m })
        }

        conn.sendMessage(m.chat, { text: `❌ Acción no válida.\n\n#shop buy <item> <cantidad>\n#shop sell <item> <cantidad/all>\n#shop info <item>` }, { quoted: m })

    } catch (e) {
        console.error('Error en shop:', e)
        conn.sendMessage(m.chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
    }
}

handler.help    = ['shop <buy/sell/info> <item> <cantidad>']
handler.tags    = ['economy', 'rpg']
handler.command = ['shop', 'tienda', 'market', 'vender', 'sell']
export default handler
