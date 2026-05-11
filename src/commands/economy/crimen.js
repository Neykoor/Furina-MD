import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const CRIMENES = [
    { nombre: '💰 Robar tienda',  prob: 0.60, min:  500, max: 2500, multa: 1000, exp: 25, txtWin: 'Vaciaste la caja sin ser visto',         txtLose: 'La alarma sonó y te atraparon'  },
    { nombre: '🏧 Hackear cajero', prob: 0.45, min: 1000, max: 5000, multa: 2000, exp: 35, txtWin: 'Bypass-easte la seguridad',              txtLose: 'El sistema te detectó'          },
    { nombre: '🚗 Robar coche',   prob: 0.50, min:  800, max: 3500, multa: 1500, exp: 30, txtWin: 'Vendiste piezas en el mercado negro',    txtLose: 'El GPS te delató'               },
    { nombre: '💎 Asaltar joyería',prob: 0.35, min: 2000, max: 8000, multa: 3000, exp: 50, txtWin: 'Escapaste con diamantes',               txtLose: 'Los guardias te redujeron'      },
    { nombre: '🏠 Estafar online', prob: 0.70, min:  300, max: 1500, multa:  800, exp: 15, txtWin: 'La víctima cayó en el phishing',        txtLose: 'Te reportaron'                  },
    { nombre: '🎰 Timar casino',  prob: 0.40, min: 1500, max: 6000, multa: 2500, exp: 40, txtWin: 'Contaste cartas como pro',              txtLose: 'El dealer te descubrió'         }
]

const handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const cd = checkCooldown(user, 'lastCrime', 30)
    if (!cd.ready) return conn.sendMessage(m.chat, { text: `🚔 *La policía te vigila*\n\nEspera *${cd.remaining}* minutos` }, { quoted: m })

    let crimen
    if (args[0]) {
        const idx = parseInt(args[0]) - 1
        if (idx >= 0 && idx < CRIMENES.length) {
            crimen = CRIMENES[idx]
        } else {
            const lista = CRIMENES.map((c, i) => `${i + 1}. ${c.nombre} (${formatMoney(c.min)}–${formatMoney(c.max)})`).join('\n')
            return conn.sendMessage(m.chat, { text: `📋 *Crímenes:*\n${lista}\n\n_Uso: #crimen [número]_` }, { quoted: m })
        }
    } else {
        crimen = CRIMENES[Math.floor(Math.random() * CRIMENES.length)]
    }

    if (Math.random() < crimen.prob) {
        const ganancia    = Math.floor(Math.random() * (crimen.max - crimen.min + 1)) + crimen.min
        const bonusNivel  = Math.floor(ganancia * (user.level || 1) * 0.03)
        const total       = ganancia + bonusNivel
        const newMoney    = (user.money || 0) + total
        const crimes      = (user.crimesSuccess || 0) + 1

        updateUser(userId, { money: newMoney, lastCrime: Date.now(), crimesSuccess: crimes })
        const expResult = addExp(userId, crimen.exp)

        let txt = `✅ *¡CRIMEN EXITOSO!*\n\n${crimen.txtWin}\n\n` +
                  `💰 *Ganancia:* ${formatMoney(ganancia)}\n` +
                  `📈 *Bonus nivel:* +${formatMoney(bonusNivel)}\n` +
                  `✨ *EXP:* +${crimen.exp}\n` +
                  `🦹 *Exitosos:* ${crimes}\n\n` +
                  `💵 *Balance:* ${formatMoney(newMoney)}`

        if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
    } else {
        const dinero   = user.money || 0
        const multa    = Math.min(crimen.multa, dinero)
        const newMoney = dinero - multa
        updateUser(userId, { money: newMoney, lastCrime: Date.now(), crimesFail: (user.crimesFail || 0) + 1 })

        await conn.sendMessage(m.chat, {
            text: `❌ *¡CRIMEN FALLIDO!*\n\n${crimen.txtLose}\n\n` +
                  `💸 *Multa:* -${formatMoney(multa)}\n` +
                  `💵 *Balance:* ${formatMoney(newMoney)}`
        }, { quoted: m })
    }
}

handler.help    = ['crimen', 'crime']
handler.tags    = ['economy', 'rpg']
handler.command = ['crimen', 'crime']
export default handler
