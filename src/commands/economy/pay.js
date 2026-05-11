import { getOrCreateUser, updateUser, formatMoney } from '../../../lib/users.js'

const handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const target = m.mentionedJid?.[0]
    if (!target)
        return conn.sendMessage(m.chat, { text: `🏷️ *Menciona a quién pagar*\n\n_Uso: #pay @usuario [cantidad]_` }, { quoted: m })

    const targetId = target.split('@')[0].replace(/\D/g, '')
    if (targetId === userId)
        return conn.sendMessage(m.chat, { text: `🤡 *No te pagues a ti mismo*` }, { quoted: m })

    const amount = parseInt(args[1])
    if (!amount || amount <= 0)
        return conn.sendMessage(m.chat, { text: `💰 *Especifica una cantidad válida*\n\n_Uso: #pay @usuario [cantidad]_` }, { quoted: m })
    if (amount > (user.money || 0))
        return conn.sendMessage(m.chat, { text: `❌ *No tienes suficiente*\n\n💵 Disponible: ${formatMoney(user.money)}` }, { quoted: m })

    const targetUser = getOrCreateUser(targetId)
    updateUser(userId,   { money: (user.money       || 0) - amount })
    updateUser(targetId, { money: (targetUser.money || 0) + amount })

    await conn.sendMessage(m.chat, {
        text: `💸 *TRANSFERENCIA EXITOSA*\n\n👤 *De:* @${userId}\n👤 *Para:* @${targetId}\n💰 *Cantidad:* ${formatMoney(amount)}\n\n💵 *Tu balance:* ${formatMoney((user.money || 0) - amount)}`,
        mentions: [m.sender, target]
    }, { quoted: m })
}

handler.help    = ['pay', 'pagar']
handler.tags    = ['economy']
handler.command = ['pay', 'pagar', 'transferir']
export default handler
