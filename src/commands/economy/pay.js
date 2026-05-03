import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const target = m.mentionedJid?.[0]
    if (!target) return conn.reply(m.chat, `🏷️ *Menciona a quién pagar*\n\n_Uso: #pay @usuario [cantidad]_`, m)

    const targetId = target.split('@')[0].replace(/\D/g, '')
    if (targetId === userId) return conn.reply(m.chat, `🤡 *No te pagues a ti mismo*`, m)

    const amount = parseInt(args[1])
    if (!amount || amount <= 0) return conn.reply(m.chat, `💰 *Especifica cantidad*\n\n_Uso: #pay @usuario [cantidad]_`, m)
    if (amount > (user.money || 0)) return conn.reply(m.chat, `❌ *No tienes suficiente*\n\n💵 Disponible: ${formatMoney(user.money)}`, m)

    const targetUser = getOrCreateUser(targetId)
    updateUser(userId, { money: (user.money || 0) - amount })
    updateUser(targetId, { money: (targetUser.money || 0) + amount })

    await conn.sendMessage(m.chat, {
        text: `💸 *TRANSFERENCIA*\n\n👤 *De:* @${userId}\n👤 *Para:* @${targetId}\n💰 *Cantidad:* ${formatMoney(amount)}\n\n💵 *Tu balance:* ${formatMoney((user.money || 0) - amount)}`,
        mentions: [m.sender, target]
    }, { quoted: m })
}

handler.help = ['pay', 'pagar']
handler.tags = ['economy']
handler.command = ['pay', 'pagar', 'transferir']
export default handler