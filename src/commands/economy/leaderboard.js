import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { MINERALES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        const cooldown = checkCooldown(user, 'lastMine', 5)
        if (!cooldown.ready) {
            return await conn.reply(m.chat, `⛏️ *Mina en enfriamiento*\n\nEspera *${cooldown.remaining}* minutos más`, m)
        }

        const equipBonus = getEquipmentBonus(userId)
        const luckBonus = equipBonus.luck || 1
        const miningBonus = equipBonus.mineria || 1

        const cantidadBase = Math.floor(Math.random() * 3) + 1 + Math.floor((user.level || 1) / 10)
        const cantidad = Math.floor(cantidadBase * miningBonus)

        const mineral = rollItem(MINERALES, luckBonus)

        if ((user.level || 1) < mineral.nivel) {
            return await conn.reply(m.chat, `⛏️ *Minaste pero no encontraste nada especial...*\n\nNecesitas nivel ${mineral.nivel} para encontrar ${mineral.nombre}\n💡 Sigue minando para subir de nivel`, m)
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

    } catch (error) {
        console.error('Error en minar:', error)
        await conn.reply(m.chat, `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}`, m)
    }
}

handler.help = ['minar', 'mine']
handler.tags = ['economy', 'rpg']
handler.command = ['minar', 'mine', 'mineria']

export default handler
