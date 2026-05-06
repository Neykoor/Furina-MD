import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { MATERIALES, rollItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastCollect', 3)
    if (!cooldown.ready) return conn.reply(m.chat, `🌿 *Recolección en enfriamiento*\n\nEspera *${cooldown.remaining}* minutos más`, m)

    const equipBonus = getEquipmentBonus(userId)
    const luckBonus = equipBonus.luck || 1

    // Cantidad base (más que minería/pesca porque es más común)
    const cantidadBase = Math.floor(Math.random() * 5) + 2 + Math.floor((user.level || 1) / 8)
    const cantidad = Math.floor(cantidadBase)

    const material = rollItem(MATERIALES, luckBonus)

    if ((user.level || 1) < material.nivel) {
        const safeMaterial = Object.values(MATERIALES).find(m => m.nivel === 1 && m.probabilidad >= 35)
        return conn.reply(m.chat, `🌿 *Recolectaste pero no encontraste nada especial...*\n\nNecesitas nivel ${material.nivel} para ${material.nombre}`, m)
    }

    const bonusNivel = Math.floor(material.valor * ((user.level || 1) * 0.02))
    const valorTotal = (material.valor + bonusNivel) * cantidad
    const expTotal = Math.floor(material.exp * cantidad * (equipBonus.exp_bonus || 1))

    addItem(userId, material.id, cantidad)

    const newMoney = (user.money || 0) + valorTotal
    updateUser(userId, { money: newMoney, lastCollect: Date.now() })

    const expResult = addExp(userId, expTotal)

    updateStats(userId, 'recolectar', { item: material, cantidad, money: valorTotal })
    updateMissionProgress(userId, 'recolectar', 1)

    const rarezaInfo = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }
    const rarezaEmoji = rarezaInfo[material.rareza] || '⚪'

    let txt = `🌿 *¡RECOLECCIÓN EXITOSA!*\n\n`
    txt += `${material.emoji} *${material.nombre}* ${rarezaEmoji}\n`
    txt += `📦 Cantidad: *${cantidad}*\n`
    txt += `💎 Rareza: *${formatRareza(material.rareza)}*\n`
    txt += `💰 Valor: *${formatMoney(valorTotal)}*\n`
    txt += `✨ EXP: *+${expTotal}*\n`
    if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*\n`
    txt += `\n💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['recolectar', 'collect', 'gather']
handler.tags = ['economy', 'rpg']
handler.command = ['recolectar', 'collect', 'gather', 'recolecta']
export default handler
