import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        const amount = args[0] === 'all' ? user.bank : parseInt(args[0])
        if (!amount || amount <= 0) {
            return await conn.sendMessage(m.chat, { text: `🏦 *¿Cuánto retirar?*\n\n_Uso: #retirar [cantidad/all]_` }, { quoted: m })
        }
        if (amount > (user.bank || 0)) {
            return await conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente en el banco*\n\n🏦 Disponible: ${formatMoney(user.bank)}` }, { quoted: m })
        }

        updateUser(userId, { money: (user.money || 0) + amount, bank: (user.bank || 0) - amount })

        await conn.sendMessage(m.chat, {
            text: `💵 *RETIRO*\n\n🏦 *Retirado:* -${formatMoney(amount)}\n💰 *Efectivo:* ${formatMoney((user.money || 0) + amount)}\n🏦 *Banco:* ${formatMoney((user.bank || 0) - amount)}`
        }, { quoted: m })

    } catch (error) {
        console.error('Error en retirar:', error)
        await conn.sendMessage(m.chat, { text: `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['retirar <cantidad>', 'ret <cantidad>']
handler.tags = ['economy']
handler.command = ['retirar', 'ret', 'withdraw']

export default handler