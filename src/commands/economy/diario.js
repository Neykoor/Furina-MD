import { getOrCreateUser, updateUser } from '../../../lib/users.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const now      = Date.now()
    const cooldown = 24 * 60 * 60 * 1000

    if (user.lastClaim && (now - user.lastClaim) < cooldown) {
        const remaining = cooldown - (now - user.lastClaim)
        const hours   = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        return conn.sendMessage(m.chat, {
            text: `⏳ Ya reclamaste tu recompensa diaria.\nVuelve en *${hours}h ${minutes}m*`
        }, { quoted: m })
    }

    const baseReward = Math.floor(Math.random() * 500) + 200
    const bonus = (user.level || 1) * 50
    const total = baseReward + bonus

    let newMoney = (user.money || 0) + total
    let newExp   = (user.exp   || 0) + 20
    let newLevel = user.level  || 1

    if (newExp >= newLevel * 100) {
        newExp -= newLevel * 100
        newLevel += 1
    }

    const updated = updateUser(userId, {
        money: newMoney,
        exp: newExp,
        level: newLevel,
        lastClaim: now
    })

    await conn.sendMessage(m.chat, {
        text: `🎁 *RECOMPENSA DIARIA*\n\n💰 Dinero: +$${total.toLocaleString()}\n✨ Exp: +20\n⭐ Nivel: ${newLevel}${bonus > 0 ? `\n🎉 Bonus por nivel: +$${bonus.toLocaleString()}` : ''}\n\n¡Vuelve mañana por más!`,
        mentions: [m.sender]
    }, { quoted: m })
}

handler.help = ['diario', 'daily', 'claim']
handler.tags = ['economy']
handler.command = ['diario', 'daily', 'claim', 'reclamar']
export default handler