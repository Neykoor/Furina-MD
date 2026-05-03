import { getOrCreateUser, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const total = (user.money || 0) + (user.bank || 0)

    const txt = `💰 *BALANCE DE @${userId}*\n\n` +
        `💵 *Efectivo:* ${formatMoney(user.money)}\n` +
        `🏦 *Banco:* ${formatMoney(user.bank)}\n` +
        `💎 *Total:* ${formatMoney(total)}\n\n` +
        `⭐ *Nivel:* ${user.level || 1}\n` +
        `✨ *EXP:* ${user.exp || 0}/${(user.level || 1) * 150}`

    await conn.sendMessage(m.chat, {
        text: txt,
        mentions: [m.sender]
    }, { quoted: m })
}

handler.help = ['balance', 'bal', 'dinero']
handler.tags = ['economy']
handler.command = ['balance', 'bal', 'dinero', 'money']
export default handler