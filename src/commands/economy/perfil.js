import { getOrCreateUser } from '../../../lib/users.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const totalMoney = (user.money || 0) + (user.bank || 0)
    const expNeeded  = (user.level || 1) * 100
    const displayName = user.profile?.displayName || userId
    const bio = user.profile?.bio || 'Sin biografía'

    const txt = [
        `👤 *PERFIL DE @${userId}*`,
        ``,
        `📛 *Nombre:* ${displayName}`,
        `📱 *Número:* +${userId}`,
        `💬 *Bio:* ${bio}`,
        ``,
        `💰 *Economía*`,
        `💵 Efectivo: $${(user.money || 0).toLocaleString()}`,
        `🏦 Banco: $${(user.bank || 0).toLocaleString()}`,
        `💎 Total: $${totalMoney.toLocaleString()}`,
        ``,
        `⭐ Nivel: ${user.level || 1}`,
        `✨ Exp: ${user.exp || 0}/${expNeeded}`,
        `📅 Registro: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'N/A'}`,
        ``,
        `🌐 Edita tu perfil en: /dashboard`
    ].join('\n')

    try {
        const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => null)
        if (pp) {
            await conn.sendMessage(m.chat, {
                image: { url: pp },
                caption: txt,
                mentions: [m.sender]
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m })
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [m.sender] }, { quoted: m })
    }
}

handler.help = ['perfil', 'profile']
handler.tags = ['economy']
handler.command = ['perfil', 'profile', 'miperfil', 'myprofile']
export default handler