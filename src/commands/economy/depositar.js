import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const amount = args[0] === 'all' ? user.money : parseInt(args[0])
    if (!amount || amount <= 0) return conn.reply(m.chat, `💰 *Cuánto depositar?*\n\n_Uso: #deposit [cantidad/all]_`, m)
    if (amount > (user.money || 0)) return conn.reply(m.chat, `❌ *No tienes suficiente*\n\n💵 Disponible: ${formatMoney(user.money)}`, m)

    updateUser(userId, { money: (user.money || 0) - amount, bank: (user.bank || 0) + amount })

    await conn.sendMessage(m.chat, {
        text: `🏦 *DEPÓSITO*\n\n💵 *Retirado:* -${formatMoney(amount)}\n🏦 *Banco:* ${formatMoney((user.bank || 0) + amount)}\n💰 *Efectivo:* ${formatMoney((user.money || 0) - amount)}`
    }, { quoted: m })
}

handler.help = ['deposit', 'dep']
handler.tags = ['economy']
handler.command = ['deposit', 'dep', 'depositar']
export default handler