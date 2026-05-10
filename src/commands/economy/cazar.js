import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { ANIMALES, rollItem, getItem, formatRareza } from '../../../lib/economy/items.js'
import { addItem, useDurability, getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'
import { huntBattle, formatBattleResult } from '../../../lib/economy/combat.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        const cooldown = checkCooldown(user, 'lastHunt', 8)
        if (!cooldown.ready) {
            return await conn.sendMessage(m.chat, { text: `🏹 *Arco en enfriamiento*\n\nEspera *${cooldown.remaining}* minutos más` }, { quoted: m })
        }

        let animalId = null
        if (args && args[0]) {
            const search = args[0].toLowerCase()
            animalId = Object.keys(ANIMALES).find(id => 
                ANIMALES[id].nombre.toLowerCase().includes(search) || 
                ANIMALES[id].id === search
            )
        }

        const equipBonus = getEquipmentBonus(userId)
        const luckBonus = equipBonus.luck || 1
        const huntBonus = equipBonus.caza || 1

        if (!animalId) {
            animalId = rollItem(ANIMALES, luckBonus).id
        }

        const animal = ANIMALES[animalId]
        if (!animal) {
            return await conn.sendMessage(m.chat, { text: `❌ Animal no encontrado. Usa #cazar sin argumentos para cazar aleatoriamente.` }, { quoted: m })
        }

        const battle = huntBattle(userId, animalId)
        if (!battle.success) {
            return await conn.sendMessage(m.chat, { text: `❌ ${battle.error}` }, { quoted: m })
        }

        const equipped = Object.entries(user.inventory || {}).find(([id, data]) => 
            data.equipado && (getItem(id)?.tipo === 'arma' || getItem(id)?.tipo === 'herramienta')
        )
        let toolBroken = false
        if (equipped) {
            const durResult = useDurability(userId, equipped[0], 1)
            toolBroken = durResult.broken
        }

        let newMoney = (user.money || 0) + battle.moneyGained
        if (newMoney < 0) newMoney = 0
        updateUser(userId, { money: newMoney, lastHunt: Date.now() })

        if (battle.expGained > 0) {
            addExp(userId, battle.expGained)
        }

        if (battle.itemsDropped) {
            for (const drop of battle.itemsDropped) {
                addItem(userId, drop.item, drop.cantidad)
            }
        }

        if (battle.victory) {
            const cantidad = Math.floor(1 * huntBonus)
            addItem(userId, animal.id, cantidad)
        }

        updateStats(userId, 'cazar', { item: animal, cantidad: battle.victory ? 1 : 0, money: battle.moneyGained })
        updateMissionProgress(userId, 'cazar', 1)
        if (battle.victory) {
            updateMissionProgress(userId, 'encontrar', 1, animal.id)
            updateMissionProgress(userId, 'cazar_especifico', 1, animal.id)
        }

        let txt = formatBattleResult(battle)
        if (toolBroken) txt += `\n\n💔 ¡Tu arma se rompió en combate!`
        if (equipBonus.caza > 1 && battle.victory) txt += `\n🏹 Bonus arma: x${equipBonus.caza.toFixed(1)}`

        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en cazar:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['cazar', 'hunt']
handler.tags = ['economy', 'rpg']
handler.command = ['cazar', 'hunt', 'caza']

export default handler