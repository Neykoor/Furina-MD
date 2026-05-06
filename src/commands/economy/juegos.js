import { getOrCreateUser, formatMoney } from '../../../lib/users.js'
import { ruletaRusa, jugarDados, blackjack, tragamonedas, carreraCaballos, formatGameResult } from '../../../lib/economy/games.js'

let handler = async (m, { conn, args, command }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    // Menu de juegos
    if (!args[0] && command === 'juegos') {
        let txt = `🎰 *CASINO - MINIJUEGOS*\n\n`
        txt += `💰 Tu balance: ${formatMoney(user.money || 0)}\n\n`
        txt += `🎮 *Juegos disponibles:*\n\n`
        txt += `🔫 *#ruleta <cantidad>* - Ruleta rusa (2x)\n`
        txt += `🎲 *#dados <cantidad> <1-6>* - Dados (5x)\n`
        txt += `🃏 *#blackjack <cantidad>* - Blackjack (2.5x)\n`
        txt += `🎰 *#slots <cantidad>* - Tragamonedas (hasta 50x)\n`
        txt += `🏇 *#caballos <cantidad> <1-5>* - Carrera (hasta 8x)\n\n`
        txt += `⚠️ Juega con responsabilidad. Puedes perder tu dinero.`
        return conn.reply(m.chat, txt, m)
    }

    let result = null
    let gameType = ''

    switch(command) {
        case 'ruleta': {
            const apuesta = parseInt(args[0])
            if (!apuesta || isNaN(apuesta)) return conn.reply(m.chat, `❌ Uso: #ruleta <cantidad>\nEjemplo: #ruleta 500`, m)
            result = ruletaRusa(userId, apuesta)
            gameType = 'ruleta'
            break
        }

        case 'dados': {
            const apuesta = parseInt(args[0])
            const numero = parseInt(args[1])
            if (!apuesta || !numero) return conn.reply(m.chat, `❌ Uso: #dados <cantidad> <número 1-6>\nEjemplo: #dados 100 5`, m)
            result = jugarDados(userId, apuesta, numero)
            gameType = 'dados'
            break
        }

        case 'blackjack': {
            const apuesta = parseInt(args[0])
            if (!apuesta) return conn.reply(m.chat, `❌ Uso: #blackjack <cantidad>\nEjemplo: #blackjack 500`, m)
            result = blackjack(userId, apuesta)
            gameType = 'blackjack'
            break
        }

        case 'slots': {
            const apuesta = parseInt(args[0])
            if (!apuesta) return conn.reply(m.chat, `❌ Uso: #slots <cantidad>\nEjemplo: #slots 100`, m)
            result = tragamonedas(userId, apuesta)
            gameType = 'slots'
            break
        }

        case 'caballos': {
            const apuesta = parseInt(args[0])
            const caballo = parseInt(args[1])
            if (!apuesta || !caballo) return conn.reply(m.chat, `❌ Uso: #caballos <cantidad> <caballo 1-5>\nEjemplo: #caballos 500 3`, m)
            result = carreraCaballos(userId, apuesta, caballo)
            gameType = 'caballos'
            break
        }
    }

    if (!result) return
    if (!result.success) return conn.reply(m.chat, `❌ ${result.error}`, m)

    const txt = formatGameResult(gameType, result)
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

// Alias para cada juego
let ruletaHandler = async (m, { conn, args }) => {
    const fakeCommand = { ...m, text: m.text }
    return handler(m, { conn, args, command: 'ruleta' })
}
let dadosHandler = async (m, { conn, args }) => handler(m, { conn, args, command: 'dados' })
let blackjackHandler = async (m, { conn, args }) => handler(m, { conn, args, command: 'blackjack' })
let slotsHandler = async (m, { conn, args }) => handler(m, { conn, args, command: 'slots' })
let caballosHandler = async (m, { conn, args }) => handler(m, { conn, args, command: 'caballos' })

handler.help = ['juegos', 'ruleta', 'dados', 'blackjack', 'slots', 'caballos']
handler.tags = ['economy', 'games']
handler.command = ['juegos', 'ruleta', 'dados', 'blackjack', 'slots', 'caballos']

export default handler
