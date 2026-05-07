import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { JEFES, bossBattle, formatBattleResult } from '../../../lib/economy/combat.js'
import { addItem } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastBoss', 60)
    if (!cooldown.ready) return conn.reply(m.chat, `👹 *Descanso de jefe*

Espera *${cooldown.remaining}* minutos mas`, m)

    if (!args[0]) {
        const nivelRequerido = { goblin: 5, ogro: 15, troll: 25, gigante: 35, dragon_anciano: 45, demonio: 60 }

        let txt = `👹 *GUARIDA DE JEFES*

`
        txt += `Usa: *#boss <nombre>* para desafiar

`
        txt += `⚔️ *Jefes disponibles:*

`

        for (const [id, jefe] of Object.entries(JEFES)) {
            const req = nivelRequerido[id] || 1
            const canFight = (user.level || 1) >= req
            const status = canFight ? '✅' : '🔒'
            txt += `${status} *${jefe.nombre}*
`
            txt += `   └ Nivel requerido: ${req} | Vida: ${jefe.vida} | Daño: ${jefe.danio}
`
            txt += `   └ 💰 $${jefe.money.toLocaleString()} | ✨ ${jefe.exp} EXP
`
            if (!canFight) txt += `   └ 🔒 Tu nivel: ${user.level || 1}
`
            txt += `
`
        }

        txt += `⚠️ Los jefes son muy poderosos. Asegurate de tener buen equipamiento.`
        return conn.reply(m.chat, txt, m)
    }

    const search = args.join(' ').toLowerCase()
    const bossId = Object.keys(JEFES).find(id => 
        JEFES[id].nombre.toLowerCase().includes(search) || id === search
    )

    if (!bossId) return conn.reply(m.chat, `❌ Jefe no encontrado. Usa *#boss* para ver la lista.`, m)

    const battle = bossBattle(userId, bossId)
    if (!battle.success) return conn.reply(m.chat, `❌ ${battle.error}`, m)

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
    txt += `

💵 *Balance:* ${formatMoney(newMoney)}`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['boss', 'jefe', 'dungeon']
handler.tags = ['economy', 'rpg']
handler.command = ['boss', 'jefe', 'dungeon', 'jefes']
export default handler
