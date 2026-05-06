import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { MINERALES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastMine', 5)
    if (!cooldown.ready) return conn.reply(m.chat, `⛏️ *Mina en enfriamiento*\n\nEspera *${cooldown.remaining}* minutos más`, m)

    // Verificar herramienta equipada
    const equipBonus = getEquipmentBonus(userId)
    const luckBonus = equipBonus.luck || 1
    const miningBonus = equipBonus.mineria || 1

    // Determinar cantidad de minerales (1-3 base, +1 por cada 10 niveles)
    const cantidadBase = Math.floor(Math.random() * 3) + 1 + Math.floor((user.level || 1) / 10)
    const cantidad = Math.floor(cantidadBase * miningBonus)

    // Roll de mineral con bonus de suerte
    const mineral = rollItem(MINERALES, luckBonus)

    // Verificar nivel mínimo
    if ((user.level || 1) < mineral.nivel) {
        // Fallback a mineral de nivel 1
        const safeMineral = Object.values(MINERALES).find(m => m.nivel === 1 && m.probabilidad >= 30)
        return conn.reply(m.chat, `⛏️ *Minaste pero no encontraste nada especial...*\n\nNecesitas nivel ${mineral.nivel} para encontrar ${mineral.nombre}\n💡 Sigue minando para subir de nivel`, m)
    }

    // Usar durabilidad de pico equipado
    const equipped = Object.entries(user.inventory || {}).find(([id, data]) => data.equipado && getItem(id)?.tipo === 'herramienta')
    let toolBroken = false
    if (equipped) {
        const durResult = useDurability(userId, equipped[0], 1)
        toolBroken = durResult.broken
    }

    // Calcular valor con bonus de nivel
    const bonusNivel = Math.floor(mineral.valor * ((user.level || 1) * 0.02))
    const valorTotal = (mineral.valor + bonusNivel) * cantidad
    const expTotal = Math.floor(mineral.exp * cantidad * (equipBonus.exp_bonus || 1))

    // Agregar al inventario
    addItem(userId, mineral.id, cantidad)

    // Actualizar usuario
    const newMoney = (user.money || 0) + valorTotal
    updateUser(userId, { money: newMoney, lastMine: Date.now() })

    // EXP
    const expResult = addExp(userId, expTotal)

    // Actualizar stats y misiones
    updateStats(userId, 'minar', { item: mineral, cantidad, money: valorTotal })
    updateMissionProgress(userId, 'minar', 1)
    updateMissionProgress(userId, 'encontrar', cantidad, mineral.id)
    if (mineral.rareza === 'legendario' || mineral.rareza === 'mitico') {
        updateMissionProgress(userId, 'encontrar_legendario', 1)
    }

    // Rareza info
    const rarezaInfo = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }
    const rarezaEmoji = rarezaInfo[mineral.rareza] || '⚪'

    let txt = `⛏️ *¡MINASTE CON ÉXITO!*\n\n`
    txt += `${mineral.emoji} *${mineral.nombre}* ${rarezaEmoji}\n`
    txt += `📦 Cantidad: *${cantidad}*\n`
    txt += `💎 Rareza: *${formatRareza(mineral.rareza)}*\n`
    txt += `💰 Valor: *${formatMoney(valorTotal)}*\n`
    txt += `✨ EXP: *+${expTotal}*\n`
    if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*\n`
    if (equipBonus.mineria > 1) txt += `🔧 Bonus pico: *x${equipBonus.mineria.toFixed(1)}*\n`
    if (toolBroken) txt += `💔 ¡Tu pico se rompió!\n`
    txt += `\n💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['minar', 'mine']
handler.tags = ['economy', 'rpg']
handler.command = ['minar', 'mine', 'minería']
export default handler
