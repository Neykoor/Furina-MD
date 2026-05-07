import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { PECES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastFish', 5)
    if (!cooldown.ready) return conn.reply(m.chat, `🎣 *Caña en enfriamiento*

Espera *${cooldown.remaining}* minutos mas`, m)

    const equipBonus = getEquipmentBonus(userId)
    const luckBonus = equipBonus.luck || 1
    const fishingBonus = equipBonus.pesca || 1

    const cantidadBase = Math.floor(Math.random() * 2) + 1 + Math.floor((user.level || 1) / 12)
    const cantidad = Math.floor(cantidadBase * fishingBonus)

    const pez = rollItem(PECES, luckBonus)

    if ((user.level || 1) < pez.nivel) {
        return conn.reply(m.chat, `🎣 *Pescaste pero no atrapaste nada especial...*

Necesitas nivel ${pez.nivel} para pescar ${pez.nombre}
💡 Sigue pescando para subir de nivel`, m)
    }

    const equipped = Object.entries(user.inventory || {}).find(([id, data]) => data.equipado && getItem(id)?.tipo === 'herramienta' && (id.includes('cana') || id.includes('caña')))
    let toolBroken = false
    if (equipped) {
        const durResult = useDurability(userId, equipped[0], 1)
        toolBroken = durResult.broken
    }

    const bonusNivel = Math.floor(pez.valor * ((user.level || 1) * 0.02))
    const valorTotal = (pez.valor + bonusNivel) * cantidad
    const expTotal = Math.floor(pez.exp * cantidad * (equipBonus.exp_bonus || 1))

    addItem(userId, pez.id, cantidad)

    const newMoney = (user.money || 0) + valorTotal
    updateUser(userId, { money: newMoney, lastFish: Date.now() })

    const expResult = addExp(userId, expTotal)

    updateStats(userId, 'pescar', { item: pez, cantidad, money: valorTotal })
    updateMissionProgress(userId, 'pescar', 1)
    updateMissionProgress(userId, 'encontrar', cantidad, pez.id)
    if (pez.rareza === 'raro' || pez.rareza === 'epico' || pez.rareza === 'legendario') {
        updateMissionProgress(userId, 'pescar_raro', 1)
    }

    const rarezaInfo = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }
    const rarezaEmoji = rarezaInfo[pez.rareza] || '⚪'

    let txt = `🎣 *¡PESCASTE CON EXITO!*

`
    txt += `${pez.emoji} *${pez.nombre}* ${rarezaEmoji}
`
    txt += `📦 Cantidad: *${cantidad}*
`
    txt += `💎 Rareza: *${formatRareza(pez.rareza)}*
`
    txt += `💰 Valor: *${formatMoney(valorTotal)}*
`
    txt += `✨ EXP: *+${expTotal}*
`
    if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*
`
    if (equipBonus.pesca > 1) txt += `🎣 Bonus caña: *x${equipBonus.pesca.toFixed(1)}*
`
    if (toolBroken) txt += `💔 ¡Tu caña se rompio!
`
    txt += `
💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `

🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['pescar', 'fish']
handler.tags = ['economy', 'rpg']
handler.command = ['pescar', 'fish', 'pesca']
export default handler
