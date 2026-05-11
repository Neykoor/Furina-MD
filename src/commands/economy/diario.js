import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const cd = checkCooldown(user, 'lastDaily', 24 * 60)
    if (!cd.ready) {
        const h = Math.floor(cd.remaining / 60)
        const min = cd.remaining % 60
        return conn.sendMessage(m.chat, { text: `⏳ *Ya reclamaste tu daily*\n\nVuelve en: *${h}h ${min}m*` }, { quoted: m })
    }

    const level       = user.level || 1
    const totalReward = 1000 + level * 100
    const expReward   = 50 + level * 5
    const newMoney    = (user.money || 0) + totalReward

    updateUser(userId, { money: newMoney, lastDaily: Date.now() })
    const expResult = addExp(userId, expReward)

    let txt = `🎁 *RECOMPENSA DIARIA*\n\n` +
              `💰 *Ganaste:* ${formatMoney(totalReward)}\n` +
              `📈 *Bonus nivel:* +${formatMoney(level * 100)}\n` +
              `✨ *EXP:* +${expReward}\n\n` +
              `💵 *Balance:* ${formatMoney(newMoney)}\n` +
              `⭐ *Nivel:* ${expResult.level}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help    = ['daily']
handler.tags    = ['economy']
handler.command = ['daily', 'diario', 'recompensa']
export default handler
