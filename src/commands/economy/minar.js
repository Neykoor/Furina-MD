import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { MINERALES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastMine', 5)
    if (!cooldown.ready) return conn.reply(m.chat, `⛏️ *Mina en enfriamiento*

Espera *${cooldown.remaining}* minutos mas`, m)

    const equipBonus = getEquipmentBonus(userId)
    const luckBonus = equipBonus.luck || 1
    const miningBonus = equipBonus.mineria || 1

    const cantidadBase = Math.floor(Math.random() * 3) + 1 + Math.floor((user.level || 1) / 10)
    const cantidad = Math.floor(cantidadBase * miningBonus)

    const mineral = rollItem(MINERALES, luckBonus)

    if ((user.level || 1) < mineral.nivel) {
        return conn.reply(m.chat, `⛏️ *Minaste pero no encontraste nada especial...*

Necesitas nivel ${mineral.nivel} para encontrar ${mineral.nombre}
💡 Sigue minando para subir de nivel`, m)
    }

    const equipped = Object.entries(user.inventory || {}).find(([id, data]) => data.equipado && getItem(id)?.tipo === 'herramienta')
    let toolBroken = false
    if (equipped) {
        const durResult = useDurability(userId, equipped[0], 1)
        toolBroken = durResult.broken
    }

    const bonusNivel = Math.floor(mineral.valor * ((user.level || 1) * 0.02))
    const valorTotal = (mineral.valor + bonusNivel) * cantidad
    const expTotal = Math.floor(mineral.exp * cantidad * (equipBonus.exp_bonus || 1))

    addItem(userId, mineral.id, cantidad)

    const newMoney = (user.money || 0) + valorTotal
    updateUser(userId, { money: newMoney, lastMine: Date.now() })

    const expResult = addExp(userId, expTotal)

    updateStats(userId, 'minar', { item: mineral, cantidad, money: valorTotal })
    updateMissionProgress(userId, 'minar', 1)
    updateMissionProgress(userId, 'encontrar', cantidad, mineral.id)
    if (mineral.rareza === 'legendario' || mineral.rareza === 'mitico') {
        updateMissionProgress(userId, 'encontrar_legendario', 1)
    }

    const rarezaInfo = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }
    const rarezaEmoji = rarezaInfo[mineral.rareza] || '⚪'

    let txt = `⛏️ *¡MINASTE CON EXITO!*

`
    txt += `${mineral.emoji} *${mineral.nombre}* ${rarezaEmoji}
`
    txt += `📦 Cantidad: *${cantidad}*
`
    txt += `💎 Rareza: *${formatRareza(mineral.rareza)}*
`
    txt += `💰 Valor: *${formatMoney(valorTotal)}*
`
    txt += `✨ EXP: *+${expTotal}*
`
    if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*
`
    if (equipBonus.mineria > 1) txt += `🔧 Bonus pico: *x${equipBonus.mineria.toFixed(1)}*
`
    if (toolBroken) txt += `💔 ¡Tu pico se rompio!
`
    txt += `
💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `

🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['minar', 'mine']
handler.tags = ['economy', 'rpg']
handler.command = ['minar', 'mine', 'mineria']
export default handler
