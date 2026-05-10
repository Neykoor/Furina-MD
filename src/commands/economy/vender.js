import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'
import { getItem } from '../../../lib/economy/items.js'
import { sellItem, getInventory } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        if (!args || args.length === 0) {
            const inventory = getInventory(userId)
            let txt = `💰 *TIENDA - VENDER ITEMS*\n\n`
            txt += `Usa: *#vender <item> [cantidad]*\n\n`
            txt += `📦 *Tus items vendibles:*\n\n`

            let hasItems = false
            for (const [id, data] of Object.entries(inventory)) {
                if (data.equipado) continue
                const item = getItem(id)
                if (!item || !item.valor) continue

                hasItems = true
                const valorUnitario = item.valor || item.precio_venta || 0
                const valorTotal = valorUnitario * data.cantidad
                txt += `${item.emoji} *${item.nombre}* x${data.cantidad}\n`
                txt += `   └ 💵 ${formatMoney(valorUnitario)} c/u = ${formatMoney(valorTotal)} total\n`
            }

            if (!hasItems) {
                txt += `📭 No tienes items para vender.\n`
                txt += `Usa #minar, #pescar, #cazar para obtener items.`
            }

            txt += `\n💡 Escribe *#vender <nombre> [cantidad]* para vender`
            return await conn.reply(m.chat, txt, m)
        }

        let cantidad = 1
        let itemName = args.join(' ')

        const lastArg = args[args.length - 1]
        if (!isNaN(lastArg) && args.length > 1) {
            cantidad = parseInt(lastArg)
            itemName = args.slice(0, -1).join(' ')
        }

        if (cantidad < 1) return await conn.reply(m.chat, `❌ Cantidad inválida`, m)

        const inventory = getInventory(userId)
        const itemId = Object.keys(inventory).find(id => {
            const item = getItem(id)
            return item && (item.nombre.toLowerCase().includes(itemName.toLowerCase()) || id === itemName.toLowerCase())
        })

        if (!itemId) return await conn.reply(m.chat, `❌ No tienes ese item en tu inventario.`, m)

        const item = getItem(itemId)
        if (!item || !item.valor) return await conn.reply(m.chat, `❌ Ese item no se puede vender.`, m)

        const result = sellItem(userId, itemId, cantidad)
        if (!result.success) return await conn.reply(m.chat, `❌ ${result.error}`, m)

        updateStats(userId, 'vender', { money: result.valor, cantidad })
        updateMissionProgress(userId, 'vender', cantidad)

        let txt = `💰 *VENTA EXITOSA*\n\n`
        txt += `${item.emoji} *${item.nombre}* x${cantidad}\n`
        txt += `💵 Ganancia: *${formatMoney(result.valor)}*\n\n`
        txt += `💵 *Nuevo balance:* ${formatMoney(result.newMoney)}`

        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en vender:', error)
        await conn.reply(m.chat, `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}`, m)
    }
}

handler.help = ['vender', 'sell']
handler.tags = ['economy', 'rpg']
handler.command = ['vender', 'sell', 'vende']

export default handler
