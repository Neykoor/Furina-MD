import { getLeaderboard, formatMoney } from '../../../lib/users.js'

const MEDALLAS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const handler = async (m, { conn, args }) => {
    try {
        const tipo  = args[0]?.toLowerCase() || 'money'
        const tipos = { money: 'Dinero en efectivo', total: 'Dinero total', exp: 'Experiencia', bank: 'Banco' }
        const sortBy = tipos[tipo] ? tipo : 'money'

        const top = getLeaderboard(10, sortBy)

        let txt = `🏆 *TOP 10 — ${tipos[sortBy].toUpperCase()}*\n\n`

        if (top.length === 0) {
            txt += `📭 No hay datos aún.`
        } else {
            for (let i = 0; i < top.length; i++) {
                const u = top[i]
                const medal = MEDALLAS[i] || `${i + 1}.`
                const valor = sortBy === 'total' ? formatMoney(u.total)
                            : sortBy === 'exp'   ? `${u.exp} EXP`
                            : formatMoney(u[sortBy])
                txt += `${medal} *${u.displayName || u.username}*\n`
                txt += `   └ ${valor} • Nv.${u.level}\n`
            }
        }

        txt += `\n📊 _Filtros: #top money | total | exp | bank_`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    } catch (e) {
        await conn.sendMessage(m.chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
    }
}

handler.help    = ['top', 'leaderboard', 'ranking']
handler.tags    = ['economy']
handler.command = ['top', 'leaderboard', 'ranking', 'rank']
export default handler
