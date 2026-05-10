import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'
import { getItem, TIENDA_ITEMS, MINERALES, PECES, MATERIALES, ANIMALES, RECETAS_CRAFTEO } from '../../../lib/economy/items.js'
import { addItem, removeItem, getInventory } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

const MULTIPLICADOR_COMPRA = 1.5
const MULTIPLICADOR_VENTA = 0.4

function getPrecioCompra(itemId) {
    const item = getItem(itemId)
    if (!item) return null
    
    if (TIENDA_ITEMS[itemId]?.precio_compra) {
        return TIENDA_ITEMS[itemId].precio_compra
    }
    
    if (item.precio_compra) {
        return item.precio_compra
    }
    
    const base = item.valor || item.precio_venta || 1
    return Math.floor(base * MULTIPLICADOR_COMPRA)
}

function getPrecioVenta(itemId) {
    const item = getItem(itemId)
    if (!item) return null
    
    if (TIENDA_ITEMS[itemId]?.precio_venta) {
        return TIENDA_ITEMS[itemId].precio_venta
    }
    
    if (item.precio_venta) {
        return item.precio_venta
    }
    
    const base = item.valor || 1
    return Math.floor(base * MULTIPLICADOR_VENTA)
}

function getAllShopItems() {
    const all = {}
    
    for (const [id, item] of Object.entries(TIENDA_ITEMS)) {
        all[id] = { ...item, compra: getPrecioCompra(id), venta: getPrecioVenta(id) }
    }
    
    for (const [id, item] of Object.entries(MINERALES)) {
        if (!all[id]) {
            all[id] = { ...item, compra: getPrecioCompra(id), venta: getPrecioVenta(id) }
        }
    }
    
    for (const [id, item] of Object.entries(PECES)) {
        if (!all[id]) {
            all[id] = { ...item, compra: getPrecioCompra(id), venta: getPrecioVenta(id) }
        }
    }
    
    for (const [id, item] of Object.entries(MATERIALES)) {
        if (!all[id]) {
            all[id] = { ...item, compra: getPrecioCompra(id), venta: getPrecioVenta(id) }
        }
    }
    
    for (const [id, item] of Object.entries(ANIMALES)) {
        if (!all[id]) {
            all[id] = { ...item, compra: getPrecioCompra(id), venta: getPrecioVenta(id) }
        }
    }
    
    return all
}

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)
        const allItems = getAllShopItems()

        if (!args || args.length === 0) {
            const inventory = getInventory(userId)
            let txt = `🏪 *TIENDA GENERAL*\n\n`
            txt += `💰 Tu balance: ${formatMoney(user.money || 0)}\n\n`

            let hasItems = false
            for (const [id, data] of Object.entries(inventory)) {
                if (data.equipado) continue
                const item = getItem(id)
                if (!item) continue

                hasItems = true
                const valorUnitario = getPrecioVenta(id)
                const valorTotal = valorUnitario * data.cantidad
                txt += `📦 ${item.emoji} *${item.nombre}* x${data.cantidad}\n`
                txt += `   └ 💵 Venta: ${formatMoney(valorUnitario)} c/u = ${formatMoney(valorTotal)} total\n`
            }

            if (!hasItems) {
                txt += `📭 No tienes items para vender.\n`
            }

            txt += `\n📋 *Comandos disponibles:*\n`
            txt += `  #shop buy <item> <cantidad> - Comprar\n`
            txt += `  #shop sell <item> <cantidad/all> - Vender\n`
            txt += `  #shop info <item> - Ver info de item\n\n`

            txt += `⚔️ *EQUIPAMIENTO EN VENTA:*\n`
            for (const [id, item] of Object.entries(TIENDA_ITEMS)) {
                txt += `  ${item.emoji} *${item.nombre}* (Nv.${item.nivel || 1}) - ${formatMoney(item.precio_compra || getPrecioCompra(id))}\n`
            }

            txt += `\n⛏️ *MINERALES:*\n`
            const minerales = Object.values(MINERALES).slice(0, 6)
            for (const item of minerales) {
                txt += `  ${item.emoji} ${item.nombre} - 💵 ${formatMoney(getPrecioCompra(item.id))}\n`
            }

            txt += `\n🐟 *PECES:*\n`
            const peces = Object.values(PECES).slice(0, 5)
            for (const item of peces) {
                txt += `  ${item.emoji} ${item.nombre} - 💵 ${formatMoney(getPrecioCompra(item.id))}\n`
            }

            txt += `\n🌿 *MATERIALES:*\n`
            const materiales = Object.values(MATERIALES).slice(0, 5)
            for (const item of materiales) {
                txt += `  ${item.emoji} ${item.nombre} - 💵 ${formatMoney(getPrecioCompra(item.id))}\n`
            }

            txt += `\n💡 Usa *#shop info <nombre>* para ver más detalles`
            return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        const action = args[0].toLowerCase()

        if (action === 'info') {
            const search = args.slice(1).join(' ').toLowerCase()
            const itemId = Object.keys(allItems).find(id => {
                const item = getItem(id)
                return item && (item.nombre.toLowerCase().includes(search) || id === search)
            })

            if (!itemId) {
                return await conn.sendMessage(m.chat, { text: `❌ Item no encontrado. Usa *#shop* para ver los disponibles.` }, { quoted: m })
            }

            const item = getItem(itemId)
            const compra = getPrecioCompra(itemId)
            const venta = getPrecioVenta(itemId)
            const have = getInventory(userId)[itemId]?.cantidad || 0

            let txt = `📦 *INFO DE ITEM*\n\n`
            txt += `${item.emoji} *${item.nombre}*\n`
            txt += `🔹 ID: ${item.id}\n`
            txt += `💎 Rareza: ${item.rareza || 'común'}\n`
            txt += `📊 Nivel: ${item.nivel || 1}\n`
            txt += `⭐ Valor base: ${formatMoney(item.valor || 0)}\n\n`
            txt += `💵 *Precio compra:* ${formatMoney(compra)}\n`
            txt += `💵 *Precio venta:* ${formatMoney(venta)}\n`
            txt += `📦 *Tienes:* ${have}\n\n`

            if (item.bonus) {
                txt += `⚡ *Bonus:*\n`
                for (const [key, val] of Object.entries(item.bonus)) {
                    if (key === 'durabilidad') {
                        txt += `  🔋 Durabilidad: ${val}\n`
                        continue
                    }
                    const labels = { mineria: '⛏️ Minería', pesca: '🎣 Pesca', caza: '🏹 Caza', talar: '🪓 Talar', luck: '🍀 Suerte', exp_bonus: '✨ EXP', defensa: '🛡️ Defensa', danio: '⚔️ Daño', charisma: '💎 Carisma' }
                    txt += `  ${labels[key] || key}: ${typeof val === 'number' && val < 10 ? `x${val.toFixed(1)}` : `+${val}`}\n`
                }
            }

            if (item.efecto) {
                txt += `🧪 *Efecto:* ${JSON.stringify(item.efecto)}\n`
            }

            if (item.requiere) {
                txt += `\n🔨 *Materiales para craftear:*\n`
                for (const [matId, cant] of Object.entries(item.requiere)) {
                    const mat = getItem(matId)
                    txt += `  • ${mat?.emoji || ''} ${mat?.nombre || matId} x${cant}\n`
                }
            }

            return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        if (action === 'buy' || action === 'comprar') {
            if (args.length < 3) {
                return await conn.sendMessage(m.chat, { text: `❌ Uso: *#shop buy <item> <cantidad>*\nEjemplo: #shop buy pico_hierro 1` }, { quoted: m })
            }

            const search = args[1].toLowerCase()
            const cantidad = parseInt(args[2])

            if (!cantidad || cantidad <= 0) {
                return await conn.sendMessage(m.chat, { text: `❌ Cantidad inválida.` }, { quoted: m })
            }

            const itemId = Object.keys(allItems).find(id => {
                const item = getItem(id)
                return item && (item.nombre.toLowerCase().includes(search) || id === search)
            })

            if (!itemId) {
                return await conn.sendMessage(m.chat, { text: `❌ Item no encontrado. Usa *#shop* para ver los disponibles.` }, { quoted: m })
            }

            const item = getItem(itemId)
            const precioUnitario = getPrecioCompra(itemId)
            const costoTotal = precioUnitario * cantidad

            if ((user.money || 0) < costoTotal) {
                return await conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente dinero*\n\n💰 Necesitas: ${formatMoney(costoTotal)}\n💵 Tienes: ${formatMoney(user.money || 0)}` }, { quoted: m })
            }

            addItem(userId, itemId, cantidad)
            updateUser(userId, { money: (user.money || 0) - costoTotal })

            let txt = `🏪 *COMPRA EXITOSA*\n\n`
            txt += `${item.emoji} *${item.nombre}* x${cantidad}\n`
            txt += `💵 Precio unitario: ${formatMoney(precioUnitario)}\n`
            txt += `💵 Total gastado: *-${formatMoney(costoTotal)}*\n\n`
            txt += `💵 *Nuevo balance:* ${formatMoney((user.money || 0) - costoTotal)}`

            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            return
        }

        if (action === 'sell' || action === 'vender') {
            if (args.length < 2) {
                return await conn.sendMessage(m.chat, { text: `❌ Uso: *#shop sell <item> <cantidad/all>*\nEjemplo: #shop sell carbon 10` }, { quoted: m })
            }

            let cantidad = 1
            let itemName = args[1]

            const lastArg = args[args.length - 1]
            if (lastArg === 'all') {
                cantidad = 'all'
                itemName = args.slice(1, -1).join(' ') || args[1]
            } else if (!isNaN(lastArg) && args.length > 2) {
                cantidad = parseInt(lastArg)
                itemName = args.slice(1, -1).join(' ')
            } else if (args.length === 2) {
                itemName = args[1]
                cantidad = 1
            }

            const search = itemName.toLowerCase()
            const inventory = getInventory(userId)

            const itemId = Object.keys(inventory).find(id => {
                const item = getItem(id)
                return item && (item.nombre.toLowerCase().includes(search) || id === search)
            })

            if (!itemId) {
                return await conn.sendMessage(m.chat, { text: `❌ No tienes ese item en tu inventario.` }, { quoted: m })
            }

            const item = getItem(itemId)
            const have = inventory[itemId]?.cantidad || 0

            if (cantidad === 'all') cantidad = have

            if (!cantidad || cantidad <= 0) {
                return await conn.sendMessage(m.chat, { text: `❌ Cantidad inválida.` }, { quoted: m })
            }

            if (have < cantidad) {
                return await conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente*\n\n📦 Tienes: ${have}\n📦 Quieres vender: ${cantidad}` }, { quoted: m })
            }

            if (inventory[itemId].equipado && have <= cantidad) {
                return await conn.sendMessage(m.chat, { text: `❌ *Desequipa el item primero*\n\nNo puedes vender items equipados.` }, { quoted: m })
            }

            const precioUnitario = getPrecioVenta(itemId)
            const gananciaTotal = precioUnitario * cantidad

            const removeResult = removeItem(userId, itemId, cantidad)
            if (!removeResult.success) {
                return await conn.sendMessage(m.chat, { text: `❌ ${removeResult.error}` }, { quoted: m })
            }

            updateUser(userId, { money: (user.money || 0) + gananciaTotal })

            updateStats(userId, 'vender', { money: gananciaTotal, cantidad })
            updateMissionProgress(userId, 'vender', cantidad)

            let txt = `🏪 *VENTA EXITOSA*\n\n`
            txt += `${item.emoji} *${item.nombre}* x${cantidad}\n`
            txt += `💵 Precio unitario: ${formatMoney(precioUnitario)}\n`
            txt += `💵 Total ganado: *+${formatMoney(gananciaTotal)}*\n\n`
            txt += `💵 *Nuevo balance:* ${formatMoney((user.money || 0) + gananciaTotal)}`

            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            return
        }

        await conn.sendMessage(m.chat, { text: `❌ Acción no válida.\n\nUsa:\n  #shop buy <item> <cantidad>\n  #shop sell <item> <cantidad/all>\n  #shop info <item>` }, { quoted: m })

    } catch (error) {
        console.error('Error en shop:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['shop <buy/sell/info> <item> <cantidad>']
handler.tags = ['economy', 'rpg']
handler.command = ['shop', 'tienda', 'market', 'vender', 'sell']

export default handler
