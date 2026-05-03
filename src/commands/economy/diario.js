import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastDaily', 24 * 60)

    if (!cooldown.ready) {
        const horas = Math.floor(cooldown.remaining / 60)
        const mins = cooldown.remaining % 60
        return conn.reply(m.chat, `⏳ *Ya reclamaste tu daily*\n\nVuelve en: *${horas}h ${mins}m*`, m)
    }

    const baseReward = 1000
    const levelBonus = (user.level || 1) * 100
    const totalReward = baseReward + levelBonus
    const expReward = 50 + (user.level || 1) * 5

    const newMoney = (user.money || 0) + totalReward
    updateUser(userId, { money: newMoney, lastDaily: Date.now() })

    const expResult = addExp(userId, expReward)

    let txt = `🎁 *RECOMPENSA DIARIA*\n\n` +
        `💰 *Ganaste:* ${formatMoney(totalReward)}\n` +
        `📈 *Bonus nivel:* +${formatMoney(levelBonus)}\n` +
        `✨ *EXP:* +${expReward}\n\n` +
        `💵 *Balance:* ${formatMoney(newMoney)}\n` +
        `⭐ *Nivel:* ${expResult.level}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help = ['daily']
handler.tags = ['economy']
handler.command = ['daily', 'diario', 'recompensa']
export default handler