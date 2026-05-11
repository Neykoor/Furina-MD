import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

const handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const amount = args[0] === 'all' ? (user.bank || 0) : parseInt(args[0])
    if (!amount || amount <= 0)
        return conn.sendMessage(m.chat, { text: `🏦 *¿Cuánto retirar?*\n\n_Uso: #retirar [cantidad/all]_` }, { quoted: m })
    if (amount > (user.bank || 0))
        return conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente en el banco*\n\n🏦 Disponible: ${formatMoney(user.bank)}` }, { quoted: m })

    const newMoney = (user.money || 0) + amount
    const newBank  = (user.bank  || 0) - amount
    updateUser(userId, { money: newMoney, bank: newBank })

    await conn.sendMessage(m.chat, {
        text: `💵 *RETIRO*\n\n🏦 *Retirado:* -${formatMoney(amount)}\n💰 *Efectivo:* ${formatMoney(newMoney)}\n🏦 *Banco:* ${formatMoney(newBank)}`
    }, { quoted: m })
}

handler.help    = ['retirar', 'ret', 'withdraw']
handler.tags    = ['economy']
handler.command = ['retirar', 'ret', 'withdraw', 'wd']
export default handler
