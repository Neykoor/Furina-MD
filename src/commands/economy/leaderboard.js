import { getLeaderboard, formatMoney } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const sortBy = args[0] === 'exp' ? 'exp' : 'money'
    const users = getLeaderboard(10, sortBy)

    let txt = `🏆 *TOP 10 - ${sortBy === 'exp' ? 'EXPERIENCIA' : 'DINERO'}*\n\n`

    users.forEach((u, i) => {
        const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'
        if (sortBy === 'exp') {
            txt += `${emoji} *${u.rank}.* ${u.displayName}\n   ⭐ Nivel ${u.level} | ✨ ${u.exp} EXP\n\n`
        } else {
            txt += `${emoji} *${u.rank}.* ${u.displayName}\n   💰 ${formatMoney(u.total)} (💵${formatMoney(u.money)} + 🏦${formatMoney(u.bank)})\n   ⭐ Nivel ${u.level}\n\n`
        }
    })

    await conn.sendMessage(m.chat, { text: txt.trim() }, { quoted: m })
}

handler.help = ['leaderboard', 'lb', 'top']
handler.tags = ['economy']
handler.command = ['leaderboard', 'lb', 'top', 'ranking']
export default handler