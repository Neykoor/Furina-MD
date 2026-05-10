import { getOrCreateUser } from '../../../lib/users.js'
import { getItem } from '../../../lib/economy/items.js'
import { generateDailyMissions, generateWeeklyMissions, initAchievements, claimMissionReward, formatMissions } from '../../../lib/economy/missions.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        generateDailyMissions(userId)
        generateWeeklyMissions(userId)
        initAchievements(userId)

        if (args && args[0]) {
            const missionId = args[0].toLowerCase()
            const result = claimMissionReward(userId, missionId)

            if (!result.success) {
                return await conn.sendMessage(m.chat, { text: `❌ ${result.error}\n\nUsa *#misiones* para ver tus misiones activas.` }, { quoted: m })
            }

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
            if (result.recompensa.titulo) txt += `  🏅 Título: ${result.recompensa.titulo}\n`

            if (result.expResult?.leveledUp) {
                txt += `\n🎉 *¡SUBISTE AL NIVEL ${result.expResult.level}!*`
            }

            return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }

        const txt = formatMissions(userId)
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en misiones:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['misiones', 'missions', 'quest']
handler.tags = ['economy', 'rpg']
handler.command = ['misiones', 'missions', 'quest', 'mision']

export default handler