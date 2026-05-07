import { getOrCreateUser } from '../../../lib/users.js'
import { generateDailyMissions, generateWeeklyMissions, initAchievements, claimMissionReward, formatMissions } from '../../../lib/economy/missions.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    generateDailyMissions(userId)
    generateWeeklyMissions(userId)
    initAchievements(userId)

    if (args[0]) {
        const missionId = args[0].toLowerCase()
        const result = claimMissionReward(userId, missionId)

        if (!result.success) return conn.reply(m.chat, `❌ ${result.error}

Usa *#misiones* para ver tus misiones activas.`, m)

        let txt = `🎉 *¡RECOMPENSA RECLAMADA!*

`
        txt += `📋 *${result.mission.nombre}*
`
        txt += `✅ Completada y reclamada

`
        txt += `💰 *Recompensas:*
`
        if (result.recompensa.money) txt += `  💵 $${result.recompensa.money.toLocaleString()}
`
        if (result.recompensa.exp) txt += `  ✨ ${result.recompensa.exp} EXP
`
        if (result.recompensa.item) {
            const { getItem } = await import('../../../lib/economy/items.js')
            const item = getItem(result.recompensa.item)
            txt += `  🎁 ${item?.emoji || ''} ${item?.nombre || result.recompensa.item}
`
        }
        if (result.recompensa.titulo) txt += `  🏅 Titulo: ${result.recompensa.titulo}
`

        if (result.expResult?.leveledUp) {
            txt += `
🎉 *¡SUBISTE AL NIVEL ${result.expResult.level}!*`
        }

        return conn.reply(m.chat, txt, m)
    }

    const txt = formatMissions(userId)
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['misiones', 'missions', 'quest']
handler.tags = ['economy', 'rpg']
handler.command = ['misiones', 'missions', 'quest', 'mision']
export default handler
