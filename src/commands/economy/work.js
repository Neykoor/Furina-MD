import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'
import { getEquipmentBonus } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats, getRango } from '../../../lib/economy/stats.js'

const trabajos = [
    { nombre: '👨‍💻 Programador', min: 200, max: 800, exp: 15 },
    { nombre: '🍔 Cocinero', min: 150, max: 600, exp: 12 },
    { nombre: '🚕 Conductor', min: 100, max: 500, exp: 10 },
    { nombre: '🎨 Diseñador', min: 250, max: 900, exp: 18 },
    { nombre: '📦 Repartidor', min: 120, max: 450, exp: 8 },
    { nombre: '🎵 Musico', min: 180, max: 700, exp: 14 },
    { nombre: '🏗️ Constructor', min: 160, max: 650, exp: 13 },
    { nombre: '📚 Profesor', min: 220, max: 750, exp: 16 },
    { nombre: '⚔️ Guardia Real', min: 300, max: 1000, exp: 20 },
    { nombre: '🔮 Alquimista', min: 350, max: 1200, exp: 25 },
    { nombre: '🏴‍☠️ Capitan Pirata', min: 400, max: 1500, exp: 30 },
    { nombre: '👑 Consejero Real', min: 500, max: 2000, exp: 35 },
]

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastWork', 10)
    if (!cooldown.ready) return conn.reply(m.chat, `⏳ *Estas cansado*

Descansa *${cooldown.remaining}* minutos mas`, m)

    const equipBonus = getEquipmentBonus(userId)
    const rango = getRango(user.level || 1)

    const trabajosDisponibles = trabajos.filter((t, i) => {
        const nivelReq = Math.floor(i / 2) * 5 + 1
        return (user.level || 1) >= nivelReq
    })

    const trabajo = trabajosDisponibles[Math.floor(Math.random() * trabajosDisponibles.length)]
    const ganancia = Math.floor(Math.random() * (trabajo.max - trabajo.min + 1)) + trabajo.min
    const bonusNivel = Math.floor(ganancia * ((user.level || 1) * 0.05))
    const bonusRango = Math.floor(ganancia * (rango.nivel * 0.01))
    const bonusEquip = Math.floor(ganancia * ((equipBonus.money || 1) - 1))
    const total = ganancia + bonusNivel + bonusRango + bonusEquip

    const newMoney = (user.money || 0) + total
    const workCount = (user.workCount || 0) + 1

    updateUser(userId, { money: newMoney, lastWork: Date.now(), workCount })

    const expTotal = Math.floor(trabajo.exp * (equipBonus.exp_bonus || 1))
    const expResult = addExp(userId, expTotal)

    updateStats(userId, 'trabajar', { money: total })
    updateMissionProgress(userId, 'trabajar', 1)
    updateMissionProgress(userId, 'ganar_dinero', total)

    let txt = `💼 *TRABAJASTE COMO ${trabajo.nombre}*

`
    txt += `💰 *Ganancia base:* ${formatMoney(ganancia)}
`
    if (bonusNivel > 0) txt += `📈 *Bonus nivel:* +${formatMoney(bonusNivel)}
`
    if (bonusRango > 0) txt += `${rango.emoji} *Bonus ${rango.nombre}:* +${formatMoney(bonusRango)}
`
    if (bonusEquip > 0) txt += `⚡ *Bonus equipamiento:* +${formatMoney(bonusEquip)}
`
    txt += `━━━━━━━━━━━━━━
`
    txt += `💵 *Total ganado:* ${formatMoney(total)}
`
    txt += `✨ *EXP:* +${expTotal}
`
    txt += `🔨 *Trabajos totales:* ${workCount}

`
    txt += `💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `

🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['work', 'trabajar']
handler.tags = ['economy', 'rpg']
handler.command = ['work', 'trabajar', 'job']
export default handler
