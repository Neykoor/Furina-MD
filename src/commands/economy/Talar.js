import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { MATERIALES_TALAR, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        const cooldown = checkCooldown(user, 'lastChop', 5)
        if (!cooldown.ready) {
            return await conn.sendMessage(m.chat, { text: `🪓 *Hacha en enfriamiento*\n\nEspera *${cooldown.remaining}* minutos más` }, { quoted: m })
        }

        const equipBonus = getEquipmentBonus(userId)
        const luckBonus = equipBonus.luck || 1
        const talarBonus = equipBonus.talar || 1

        const cantidadBase = Math.floor(Math.random() * 4) + 2 + Math.floor((user.level || 1) / 8)
        const cantidad = Math.floor(cantidadBase * talarBonus)

        const material = rollItem(MATERIALES_TALAR, luckBonus)

        if ((user.level || 1) < material.nivel) {
            return await conn.sendMessage(m.chat, { text: `🪓 *Talaaste pero no encontraste nada especial...*\n\nNecesitas nivel ${material.nivel} para ${material.nombre}` }, { quoted: m })
        }

        const equipped = Object.entries(user.inventory || {}).find(([id, data]) => data.equipado && getItem(id)?.tipo === 'herramienta')
        let toolBroken = false
        if (equipped) {
            const durResult = useDurability(userId, equipped[0], 1)
            toolBroken = durResult.broken
        }

        const bonusNivel = Math.floor(material.valor * ((user.level || 1) * 0.02))
        const valorTotal = (material.valor + bonusNivel) * cantidad
        const expTotal = Math.floor(material.exp * cantidad * (equipBonus.exp_bonus || 1))

        addItem(userId, material.id, cantidad)

        const newMoney = (user.money || 0) + valorTotal
        updateUser(userId, { money: newMoney, lastChop: Date.now() })

        const expResult = addExp(userId, expTotal)

        updateStats(userId, 'talar', { item: material, cantidad, money: valorTotal })
        updateMissionProgress(userId, 'talar', 1)

        const rarezaInfo = { comun: '⚪', poco_comun: '🟢', raro: '🔵', epico: '🟣', legendario: '🟡', mitico: '🔴' }
        const rarezaEmoji = rarezaInfo[material.rareza] || '⚪'

        let txt = `🪓 *¡TALA EXITOSA!*\n\n`
        txt += `${material.emoji} *${material.nombre}* ${rarezaEmoji}\n`
        txt += `📦 Cantidad: *${cantidad}*\n`
        txt += `💎 Rareza: *${formatRareza(material.rareza)}*\n`
        txt += `💰 Valor: *${formatMoney(valorTotal)}*\n`
        txt += `✨ EXP: *+${expTotal}*\n`
        if (bonusNivel > 0) txt += `📈 Bonus nivel: *+${formatMoney(bonusNivel * cantidad)}*\n`
        if (equipBonus.talar > 1) txt += `🔧 Bonus hacha: *x${equipBonus.talar.toFixed(1)}*\n`
        if (toolBroken) txt += `💔 ¡Tu hacha se rompió!\n`
        txt += `\n💵 *Balance:* ${formatMoney(newMoney)}`

        if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en talar:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['talar', 'chop', 'cortar']
handler.tags = ['economy', 'rpg']
handler.command = ['talar', 'chop', 'cortar', 'tala']

export default handler
