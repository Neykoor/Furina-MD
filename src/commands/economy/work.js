import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const trabajos = [
    { nombre: '👨‍💻 Programador', min: 200, max: 800, exp: 15 },
    { nombre: '🍔 Cocinero', min: 150, max: 600, exp: 12 },
    { nombre: '🚕 Conductor', min: 100, max: 500, exp: 10 },
    { nombre: '🎨 Diseñador', min: 250, max: 900, exp: 18 },
    { nombre: '📦 Repartidor', min: 120, max: 450, exp: 8 },
    { nombre: '🎵 Músico', min: 180, max: 700, exp: 14 },
    { nombre: '🏗️ Constructor', min: 160, max: 650, exp: 13 },
    { nombre: '📚 Profesor', min: 220, max: 750, exp: 16 }
]

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastWork', 15)
    if (!cooldown.ready) return conn.reply(m.chat, `⏳ *Estás cansado*\n\nDescansa *${cooldown.remaining}* minutos más`, m)

    const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)]
    const ganancia = Math.floor(Math.random() * (trabajo.max - trabajo.min + 1)) + trabajo.min
    const bonusNivel = Math.floor(ganancia * ((user.level || 1) * 0.05))
    const total = ganancia + bonusNivel

    const newMoney = (user.money || 0) + total
    const workCount = (user.workCount || 0) + 1

    updateUser(userId, { money: newMoney, lastWork: Date.now(), workCount })

    const expResult = addExp(userId, trabajo.exp)

    let txt = `💼 *TRABAJASTE COMO ${trabajo.nombre}*\n\n` +
        `💰 *Ganancia:* ${formatMoney(ganancia)}\n` +
        `📈 *Bonus nivel:* +${formatMoney(bonusNivel)}\n` +
        `✨ *EXP:* +${trabajo.exp}\n` +
        `🔨 *Trabajos:* ${workCount}\n\n` +
        `💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['work', 'trabajar']
handler.tags = ['economy']
handler.command = ['work', 'trabajar', 'job']
export default handler