import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { PECES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

const RAREZA_EMOJI = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }

const handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const cd = checkCooldown(user, 'lastFish', 5)
    if (!cd.ready)
        return conn.sendMessage(m.chat, { text: `🎣 *Caña en enfriamiento*\n\nEspera *${cd.remaining}* minutos más` }, { quoted: m })

    const equipBonus   = getEquipmentBonus(userId)
    const luckBonus    = equipBonus.luck   || 1
    const fishingBonus = equipBonus.pesca  || 1

    const cantidadBase = Math.floor(Math.random() * 2) + 1 + Math.floor((user.level || 1) / 12)
    const cantidad     = Math.floor(cantidadBase * fishingBonus)
    const pez          = rollItem(PECES, luckBonus)

    if ((user.level || 1) < pez.nivel)
        return conn.sendMessage(m.chat, { text: `🎣 *Pescaste pero no atrapaste nada especial...*\n\nNecesitas nivel ${pez.nivel} para pescar ${pez.nombre}\n💡 Sigue pescando para subir de nivel` }, { quoted: m })

    const equipped = Object.entries(user.inventory || {}).find(([id, data]) =>
        data.equipado && getItem(id)?.tipo === 'herramienta' && (id.includes('cana') || id.includes('caña'))
    )
    let toolBroken = false
    if (equipped) toolBroken = useDurability(userId, equipped[0], 1).broken

    const bonusNivel = Math.floor(pez.valor * (user.level || 1) * 0.02)
    const valorTotal = (pez.valor + bonusNivel) * cantidad
    const expTotal   = Math.floor(pez.exp * cantidad * (equipBonus.exp_bonus || 1))

    addItem(userId, pez.id, cantidad)
    const newMoney = (user.money || 0) + valorTotal
    updateUser(userId, { money: newMoney, lastFish: Date.now() })
    const expResult = addExp(userId, expTotal)

    updateStats(userId, 'pescar', { item: pez, cantidad, money: valorTotal })
    updateMissionProgress(userId, 'pescar', 1)
    updateMissionProgress(userId, 'encontrar', cantidad, pez.id)
    if (['raro', 'epico', 'legendario'].includes(pez.rareza))
        updateMissionProgress(userId, 'pescar_raro', 1)

    let txt = `🎣 *¡PESCASTE CON ÉXITO!*\n\n`
    txt += `${pez.emoji} *${pez.nombre}* ${RAREZA_EMOJI[pez.rareza] || '⚪'}\n`
    txt += `📦 Cantidad: *${cantidad}*\n`
    txt += `💎 Rareza: *${formatRareza(pez.rareza)}*\n`
    txt += `💰 Valor: *${formatMoney(valorTotal)}*\n`
    txt += `✨ EXP: *+${expTotal}*\n`
    if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*\n`
    if (fishingBonus > 1) txt += `🎣 Bonus caña: *x${fishingBonus.toFixed(1)}*\n`
    if (toolBroken) txt += `💔 ¡Tu caña se rompió!\n`
    txt += `\n💵 *Balance:* ${formatMoney(newMoney)}`
    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help    = ['pescar', 'fish']
handler.tags    = ['economy', 'rpg']
handler.command = ['pescar', 'fish', 'pesca']
export default handler
