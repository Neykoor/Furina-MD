import { getOrCreateUser, updateUser, addExp, checkCooldown, formatMoney } from '../../../lib/users.js'

const CLIENTES = [
    { nombre: '👔 Ejecutivo',  min: 300, max: 1200, exp: 20 },
    { nombre: '🎩 Millonario', min: 500, max: 2000, exp: 25 },
    { nombre: '👮 Policía',    min: 200, max:  800, exp: 15 },
    { nombre: '🕵️ Anónimo',   min: 400, max: 1500, exp: 22 },
    { nombre: '🤵 Mafioso',   min: 600, max: 2500, exp: 30 }
]

const handler = async (m, { conn }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user   = getOrCreateUser(userId)

    const cd = checkCooldown(user, 'lastSlut', 20)
    if (!cd.ready)
        return conn.sendMessage(m.chat, { text: `😴 *Necesitas descansar*\n\nVuelve en *${cd.remaining}* minutos` }, { quoted: m })

    const cliente    = CLIENTES[Math.floor(Math.random() * CLIENTES.length)]
    const ganancia   = Math.floor(Math.random() * (cliente.max - cliente.min + 1)) + cliente.min
    const bonusNivel = Math.floor(ganancia * (user.level || 1) * 0.04)
    const total      = ganancia + bonusNivel
    const newMoney   = (user.money || 0) + total
    const slutCount  = (user.slutCount || 0) + 1

    updateUser(userId, { money: newMoney, lastSlut: Date.now(), slutCount })
    const expResult = addExp(userId, cliente.exp)

    let txt = `😏 *TRABAJASTE CON ${cliente.nombre}*\n\n` +
              `💰 *Ganancia:* ${formatMoney(ganancia)}\n` +
              `📈 *Bonus nivel:* +${formatMoney(bonusNivel)}\n` +
              `✨ *EXP:* +${cliente.exp}\n` +
              `🔥 *Servicios:* ${slutCount}\n\n` +
              `💵 *Balance:* ${formatMoney(newMoney)}`

    if (expResult.leveledUp) txt += `\n\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

handler.help    = ['slut']
handler.tags    = ['economy', 'nsfw']
handler.command = ['slut', 'puta', 'scort']
export default handler
