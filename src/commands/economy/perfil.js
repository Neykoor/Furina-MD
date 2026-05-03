import { getOrCreateUser, formatMoney, getExpNeeded } from '../../../lib/users.js'

let handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const totalMoney = (user.money || 0) + (user.bank || 0)
    const expNeeded = getExpNeeded(user.level || 1)
    const displayName = user.profile?.displayName || userId
    const bio = user.profile?.bio || 'Sin biografía'

    const stats = [
        `🔨 Trabajos: ${user.workCount || 0}`,
        `🦹 Crímenes: ${user.crimesSuccess || 0}✅ / ${user.crimesFail || 0}❌`,
        `🚔 Robos: ${user.robSuccess || 0}✅ / ${user.robFail || 0}❌`,
        `🔥 Servicios: ${user.slutCount || 0}`
    ].join(' | ')

    const barraExp = '█'.repeat(Math.min(Math.floor((user.exp / expNeeded) * 10), 10)) +
        '░'.repeat(10 - Math.min(Math.floor((user.exp / expNeeded) * 10), 10))

    const txt = [
        `👤 *PERFIL DE @${userId}*`,
        ``,
        `📛 *Nombre:* ${displayName}`,
        `📱 *Número:* +${userId}`,
        `💬 *Bio:* ${bio}`,
        ``,
        `💰 *Economía*`,
        `💵 Efectivo: ${formatMoney(user.money)}`,
        `🏦 Banco: ${formatMoney(user.bank)}`,
        `💎 Total: ${formatMoney(totalMoney)}`,
        ``,
        `⭐ *Nivel:* ${user.level || 1}`,
        `✨ *EXP:* ${user.exp || 0}/${expNeeded}`,
        `${barraExp}`,
        ``,
        `📊 *Estadísticas*`,
        stats,
        ``,
        `📅 Registro: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'N/A'}`
    ].join('\n')

    try {
        const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => null)
        if (pp) {
            await conn.sendMessage(m.chat, { image: { url: pp }, caption: txt, mentions: [m.sender] }, { quoted: m })
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