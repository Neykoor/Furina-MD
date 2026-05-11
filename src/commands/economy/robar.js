import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const cd = checkCooldown(user, 'lastRob', 45)
    if (!cd.ready)
        return conn.sendMessage(m.chat, { text: `🚔 *La policía te vigila*\n\nEspera *${cd.remaining}* minutos` }, { quoted: m })

    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target)
        return conn.sendMessage(m.chat, { text: `🏷️ *Menciona al usuario a robar*\n\n_Uso: #rob @usuario_` }, { quoted: m })

    const targetId = target.split('@')[0].replace(/\D/g, '')
    if (targetId === userId)
        return conn.sendMessage(m.chat, { text: `🤡 *No puedes robarte a ti mismo*` }, { quoted: m })

    const victim = getOrCreateUser(targetId)
    if ((victim.money || 0) < 100)
        return conn.sendMessage(m.chat, { text: `💸 *@${targetId} no tiene dinero suficiente*`, mentions: [target] }, { quoted: m })

    const prob   = Math.min(0.40 + (user.level || 1) * 0.02, 0.75)
    const exito  = Math.random() < prob

    if (exito) {
        const victimMoney = victim.money || 0
        const robado  = Math.floor(Math.random() * (victimMoney * 0.20) + victimMoney * 0.10)
        const newMy   = (user.money || 0) + robado
        updateUser(userId,   { money: newMy,                 lastRob: Date.now(), robSuccess: (user.robSuccess || 0) + 1 })
        updateUser(targetId, { money: victimMoney - robado })

        const expResult = addExp(userId, 40)
        let txt = `🦹 *¡ROBO EXITOSO!*\n\nA @${targetId}\n💰 *Robado:* ${formatMoney(robado)}\n✨ *EXP:* +40\n\n💵 *Balance:* ${formatMoney(newMy)}`
        if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`
        await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender, target] }, { quoted: m })
    } else {
        const multa    = Math.floor((user.money || 0) * 0.10)
        const newMoney = Math.max(0, (user.money || 0) - multa)
        updateUser(userId, { money: newMoney, lastRob: Date.now(), robFail: (user.robFail || 0) + 1 })

        await conn.sendMessage(m.chat, {
            text: `❌ *¡ROBO FALLIDO!*\n\nIntentaste robar a @${targetId}\n💸 *Multa:* -${formatMoney(multa)}\n💵 *Balance:* ${formatMoney(newMoney)}`,
            mentions: [m.sender, target]
        }, { quoted: m })
    }
}

handler.help    = ['rob', 'robar']
handler.tags    = ['economy']
handler.command = ['rob', 'robar', 'steal']
export default handler
