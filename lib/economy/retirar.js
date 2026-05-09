import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const amount = args[0] === 'all' ? user.bank : parseInt(args[0])
    if (!amount || amount <= 0) return conn.reply(m.chat, `🏦 *Cuánto retirar?*

_Uso: #retirar [cantidad/all]_`, m)
    if (amount > (user.bank || 0)) return conn.reply(m.chat, `❌ *No tienes en el banco*

🏦 Disponible: ${formatMoney(user.bank)}`, m)

    updateUser(userId, { money: (user.money || 0) + amount, bank: (user.bank || 0) - amount })

    await conn.sendMessage(m.chat, {
        text: `💵 *RETIRO*

🏦 *Retirado:* -${formatMoney(amount)}
💰 *Efectivo:* ${formatMoney((user.money || 0) + amount)}
🏦 *Banco:* ${formatMoney((user.bank || 0) - amount)}`
    }, { quoted: m })
}

handler.help = ['retirar <cantidad>', 'ret <cantidad>']
handler.tags = ['economy']
handler.command = ['retirar', 'ret', 'withdraw']

export default handler
