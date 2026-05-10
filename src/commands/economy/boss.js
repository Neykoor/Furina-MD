import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { JEFES, bossBattle, formatBattleResult } from '../../../lib/economy/combat.js'
import { addItem } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        const cooldown = checkCooldown(user, 'lastBoss', 60)
        if (!cooldown.ready) {
            return await conn.sendMessage(m.chat, { text: `👹 *Descanso de jefe*\n\nEspera *${cooldown.remaining}* minutos más` }, { quoted: m })
        }

        if (!args || args.length === 0) {
            const nivelRequerido = { goblin: 5, ogro: 15, troll: 25, gigante: 35, dragon_anciano: 45, demonio: 60 }

            let txt = `👹 *GUARIDA DE JEFES*\n\n`
            txt += `Usa: *#boss <nombre>* para desafiar\n\n`
            txt += `⚔️ *Jefes disponibles:*\n\n`

            for (const [id, jefe] of Object.entries(JEFES)) {
                const req = nivelRequerido[id] || 1
                const canFight = (user.level || 1) >= req
                const status = canFight ? '✅' : '🔒'
                txt += `${status} *${jefe.nombre}*\n`
                txt += `   └ Nivel requerido: ${req} | Vida: ${jefe.vida} | Daño: ${jefe.danio}\n`
                txt += `   └ 💰 $${jefe.money.toLocaleString()} | ✨ ${jefe.exp} EXP\n`
                if (!canFight) txt += `   └ 🔒 Tu nivel: ${user.level || 1}\n`
                txt += `\n`
            }

            txt += `⚠️ Los jefes son muy poderosos. Asegúrate de tener buen equipamiento.`
            return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        const search = args.join(' ').toLowerCase()
        const bossId = Object.keys(JEFES).find(id => 
            JEFES[id].nombre.toLowerCase().includes(search) || id === search
        )

        if (!bossId) {
            return await conn.sendMessage(m.chat, { text: `❌ Jefe no encontrado. Usa *#boss* para ver la lista.` }, { quoted: m })
        }

        const battle = bossBattle(userId, bossId)
        if (!battle.success) {
            return await conn.sendMessage(m.chat, { text: `❌ ${battle.error}` }, { quoted: m })
        }

        let newMoney = (user.money || 0) + battle.moneyGained
        if (newMoney < 0) newMoney = 0
        updateUser(userId, { money: newMoney, lastBoss: Date.now() })

        if (battle.expGained > 0) addExp(userId, battle.expGained)

        if (battle.itemsDropped) {
            for (const drop of battle.itemsDropped) {
                addItem(userId, drop.item, drop.cantidad)
            }
        }

        updateStats(userId, 'combate', { result: battle.victory ? 'win' : 'loss', damage: battle.playerStats?.danio })

        if (battle.victory) {
            updateMissionProgress(userId, 'encontrar_legendario', 1)
        }

        let txt = formatBattleResult(battle)
        txt += `\n\n💵 *Balance:* ${formatMoney(newMoney)}`

        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en boss:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['boss', 'jefe', 'dungeon']
handler.tags = ['economy', 'rpg']
handler.command = ['boss', 'jefe', 'dungeon', 'jefes']

export default handler