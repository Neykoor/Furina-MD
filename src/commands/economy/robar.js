import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastRob', 45)
    if (!cooldown.ready) return conn.reply(m.chat, `🚔 *La policía te vigila*\n\nEspera *${cooldown.remaining}* minutos`, m)

    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) return conn.reply(m.chat, `🏷️ *Menciona al usuario a robar*\n\n_Uso: #rob @usuario_`, m)

    const targetId = target.split('@')[0].replace(/\D/g, '')
    if (targetId === userId) return conn.reply(m.chat, `🤡 *No puedes robarte a ti mismo*`, m)

    const victim = getOrCreateUser(targetId)
    const victimMoney = victim.money || 0
    if (victimMoney < 100) return conn.reply(m.chat, `💸 *@${targetId} no tiene dinero*`, m, { mentions: [target] })

    const prob = Math.min(0.40 + ((user.level || 1) * 0.02), 0.75)
    const exito = Math.random() < prob

    if (exito) {
        const maxRobo = Math.floor(victimMoney * 0.30)
        const minRobo = Math.floor(victimMoney * 0.10)
        const robado = Math.floor(Math.random() * (maxRobo - minRobo + 1)) + minRobo

        updateUser(userId, { money: (user.money || 0) + robado, lastRob: Date.now(), robSuccess: (user.robSuccess || 0) + 1 })
        updateUser(targetId, { money: victimMoney - robado })

        const expResult = addExp(userId, 40)
        let txt = `🦹 *¡ROBO EXITOSO!*\n\nA @${targetId}\n💰 *Robado:* ${formatMoney(robado)}\n✨ *EXP:* +40\n\n💵 *Balance:* ${formatMoney((user.money || 0) + robado)}`
        if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

        await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender, target] }, { quoted: m })
    } else {
        const multa = Math.floor((user.money || 0) * 0.10)
        const newMoney = Math.max(0, (user.money || 0) - multa)
        updateUser(userId, { money: newMoney, lastRob: Date.now(), robFail: (user.robFail || 0) + 1 })

        await conn.sendMessage(m.chat, {
            text: `❌ *¡ROBO FALLIDO!*\n\nIntentaste robar a @${targetId}\n💸 *Multa:* -${formatMoney(multa)}\n💵 *Balance:* ${formatMoney(newMoney)}`,
            mentions: [m.sender, target]
        }, { quoted: m })
    }
}

handler.help = ['rob', 'robar']
handler.tags = ['economy']
handler.command = ['rob', 'robar', 'steal']
export default handler