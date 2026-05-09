import { getOrCreateUser } from '../../../lib/users.js'
import { getItem } from '../../../lib/economy/items.js'
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

        if (!result.success) return conn.reply(m.chat, `❌ ${result.error}\n\nUsa *#misiones* para ver tus misiones activas.`, m)

        let txt = `🎉 *¡RECOMPENSA RECLAMADA!*\n\n`
        txt += `📋 *${result.mission.nombre}*\n`
        txt += `✅ Completada y reclamada\n\n`
        txt += `💰 *Recompensas:*\n`
        if (result.recompensa.money) txt += `  💵 $${result.recompensa.money.toLocaleString()}\n`
        if (result.recompensa.exp) txt += `  ✨ ${result.recompensa.exp} EXP\n`
        if (result.recompensa.item) {
            const item = getItem(result.recompensa.item)
            txt += `  🎁 ${item?.emoji || ''} ${item?.nombre || result.recompensa.item}\n`
        }
        if (result.recompensa.titulo) txt += `  🏅 Titulo: ${result.recompensa.titulo}\n`

        if (result.expResult?.leveledUp) {
            txt += `\n🎉 *¡SUBISTE AL NIVEL ${result.expResult.level}!*`
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
