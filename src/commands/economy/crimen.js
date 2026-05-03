import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const crimenes = [
    { nombre: '💰 Robar tienda', prob: 0.60, min: 500, max: 2500, multa: 1000, exp: 25, txtWin: 'Vacias-te la caja sin ser visto', txtLose: 'La alarma sonó y te atraparon' },
    { nombre: '🏧 Hackear cajero', prob: 0.45, min: 1000, max: 5000, multa: 2000, exp: 35, txtWin: 'Bypass-easte la seguridad', txtLose: 'El sistema te detectó' },
    { nombre: '🚗 Robar coche', prob: 0.50, min: 800, max: 3500, multa: 1500, exp: 30, txtWin: 'Vendiste piezas en el mercado negro', txtLose: 'El GPS te delató' },
    { nombre: '💎 Asaltar joyería', prob: 0.35, min: 2000, max: 8000, multa: 3000, exp: 50, txtWin: 'Escapaste con diamantes', txtLose: 'Los guardias te redujeron' },
    { nombre: '🏠 Estafar online', prob: 0.70, min: 300, max: 1500, multa: 800, exp: 15, txtWin: 'La víctima cayó en el phishing', txtLose: 'Te reportaron' },
    { nombre: '🎰 Timar casino', prob: 0.40, min: 1500, max: 6000, multa: 2500, exp: 40, txtWin: 'Contaste cartas como pro', txtLose: 'El dealer te descubrió' }
]

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    const cooldown = checkCooldown(user, 'lastCrime', 30)
    if (!cooldown.ready) return conn.reply(m.chat, `🚔 *La policía te vigila*\n\nEspera *${cooldown.remaining}* minutos`, m)

    let crimen
    if (args[0]) {
        const idx = parseInt(args[0]) - 1
        if (idx >= 0 && idx < crimenes.length) crimen = crimenes[idx]
        else {
            const lista = crimenes.map((c, i) => `${i + 1}. ${c.nombre} (💰${formatMoney(c.min)}-${formatMoney(c.max)})`).join('\n')
            return conn.reply(m.chat, `📋 *Crimenes:*\n${lista}\n\n_Uso: #crimen [número]_`, m)
        }
    } else {
        crimen = crimenes[Math.floor(Math.random() * crimenes.length)]
    }

    const exito = Math.random() < crimen.prob

    if (exito) {
        const ganancia = Math.floor(Math.random() * (crimen.max - crimen.min + 1)) + crimen.min
        const bonusNivel = Math.floor(ganancia * ((user.level || 1) * 0.03))
        const total = ganancia + bonusNivel

        const newMoney = (user.money || 0) + total
        const crimesSuccess = (user.crimesSuccess || 0) + 1

        updateUser(userId, { money: newMoney, lastCrime: Date.now(), crimesSuccess })
        const expResult = addExp(userId, crimen.exp)

        let txt = `✅ *¡CRIMEN EXITOSO!*\n\n${crimen.txtWin}\n\n` +
            `💰 *Ganancia:* ${formatMoney(ganancia)}\n` +
            `📈 *Bonus:* +${formatMoney(bonusNivel)}\n` +
            `✨ *EXP:* +${crimen.exp}\n` +
            `🦹 *Exitosos:* ${crimesSuccess}\n\n` +
            `💵 *Balance:* ${formatMoney(newMoney)}`

        if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } else {
        const dineroActual = user.money || 0
        const multa = Math.min(crimen.multa, dineroActual)
        const newMoney = dineroActual - multa
        const crimesFail = (user.crimesFail || 0) + 1

        updateUser(userId, { money: newMoney, lastCrime: Date.now(), crimesFail })

        await conn.sendMessage(m.chat, {
            text: `❌ *¡CRIMEN FALLIDO!*\n\n${crimen.txtLose}\n\n` +
                `💸 *Multa:* -${formatMoney(multa)}\n` +
                `💵 *Balance:* ${formatMoney(newMoney)}`
        }, { quoted: m })
    }
}

handler.help = ['crimen']
handler.tags = ['economy', 'rpg']
handler.command = ['crimen', 'crime']
export default handler