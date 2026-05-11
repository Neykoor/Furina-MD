import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

const handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const amount = args[0] === 'all' ? (user.money || 0) : parseInt(args[0])
    if (!amount || amount <= 0)
        return conn.sendMessage(m.chat, { text: `💰 *¿Cuánto depositar?*\n\n_Uso: #deposit [cantidad/all]_` }, { quoted: m })
    if (amount > (user.money || 0))
        return conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente*\n\n💵 Disponible: ${formatMoney(user.money)}` }, { quoted: m })

    const newMoney = (user.money || 0) - amount
    const newBank  = (user.bank  || 0) + amount
    updateUser(userId, { money: newMoney, bank: newBank })

    await conn.sendMessage(m.chat, {
        text: `🏦 *DEPÓSITO*\n\n💵 *Depositado:* +${formatMoney(amount)}\n🏦 *Banco:* ${formatMoney(newBank)}\n💰 *Efectivo:* ${formatMoney(newMoney)}`
    }, { quoted: m })
}

handler.help    = ['deposit', 'dep']
handler.tags    = ['economy']
handler.command = ['deposit', 'dep', 'depositar']
export default handler
