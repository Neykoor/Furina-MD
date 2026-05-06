// lib/economy/games.js
// ════════════════════════════════════════════════════════════════
// MINIJUEGOS: RULETA, DADOS, BLACKJACK, TRAGAMONEDAS, APUESTAS
// ════════════════════════════════════════════════════════════════
import { getOrCreateUser, updateUser, addExp } from '../users.js'

// ── Ruleta Rusa ────────────────────────────────────────────────
export function ruletaRusa(username, apuesta) {
    const user = getOrCreateUser(username)
    const money = user.money || 0

    if (apuesta > money) return { success: false, error: 'No tienes suficiente dinero' }
    if (apuesta < 100) return { success: false, error: 'Apuesta mínima: $100' }

    const bala = Math.floor(Math.random() * 6) + 1 // 1-6
    const gatillo = Math.floor(Math.random() * 6) + 1

    const muerto = bala === gatillo

    let ganancia = 0
    let exp = 0

    if (!muerto) {
        // Sobreviviste: ganas 2x tu apuesta
        ganancia = apuesta * 2
        exp = Math.floor(apuesta / 100)
    } else {
        // Muerto: pierdes todo lo apostado + penalización
        ganancia = -apuesta
        exp = 5 // EXP de consuelo
    }

    const newMoney = money + ganancia
    updateUser(username, { money: newMoney })
    addExp(username, exp)

    return {
        success: true,
        muerto,
        bala,
        gatillo,
        apuesta,
        ganancia,
        exp,
        newMoney
    }
}

// ── Dados ──────────────────────────────────────────────────────
export function jugarDados(username, apuesta, numeroElegido) {
    const user = getOrCreateUser(username)
    const money = user.money || 0

    if (apuesta > money) return { success: false, error: 'No tienes suficiente dinero' }
    if (apuesta < 50) return { success: false, error: 'Apuesta mínima: $50' }
    if (numeroElegido < 1 || numeroElegido > 6) return { success: false, error: 'Elige un número del 1 al 6' }

    const dado = Math.floor(Math.random() * 6) + 1
    const acertado = dado === numeroElegido

    let ganancia = 0
    let exp = 0

    if (acertado) {
        ganancia = apuesta * 5 // 5x por acertar número exacto
        exp = Math.floor(apuesta / 50)
    } else {
        ganancia = -apuesta
        exp = 2
    }

    const newMoney = money + ganancia
    updateUser(username, { money: newMoney })
    addExp(username, exp)

    return {
        success: true,
        acertado,
        dado,
        numeroElegido,
        apuesta,
        ganancia,
        exp,
        newMoney
    }
}

// ── Blackjack simplificado ─────────────────────────────────────
export function blackjack(username, apuesta) {
    const user = getOrCreateUser(username)
    const money = user.money || 0

    if (apuesta > money) return { success: false, error: 'No tienes suficiente dinero' }
    if (apuesta < 100) return { success: false, error: 'Apuesta mínima: $100' }

    // Valores de cartas
    const cartas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10] // As=1, J/Q/K=10

    const sacarCarta = () => cartas[Math.floor(Math.random() * cartas.length)]

    let jugador = [sacarCarta(), sacarCarta()]
    let crupier = [sacarCarta(), sacarCarta()]

    const sumar = (mano) => {
        let total = mano.reduce((a, b) => a + b, 0)
        // As como 11 si no se pasa
        if (mano.includes(1) && total + 10 <= 21) total += 10
        return total
    }

    let totalJugador = sumar(jugador)
    let totalCrupier = sumar(crupier)

    // Crupier juega automáticamente
    while (totalCrupier < 17) {
        crupier.push(sacarCarta())
        totalCrupier = sumar(crupier)
    }

    let resultado = ''
    let ganancia = 0
    let exp = 0

    const blackjackJugador = jugador.length === 2 && totalJugador === 21
    const blackjackCrupier = crupier.length === 2 && totalCrupier === 21

    if (blackjackJugador && !blackjackCrupier) {
        resultado = 'blackjack'
        ganancia = Math.floor(apuesta * 2.5)
        exp = Math.floor(apuesta / 40)
    } else if (totalJugador > 21) {
        resultado = 'bust'
        ganancia = -apuesta
        exp = 5
    } else if (totalCrupier > 21) {
        resultado = 'win'
        ganancia = apuesta * 2
        exp = Math.floor(apuesta / 80)
    } else if (totalJugador > totalCrupier) {
        resultado = 'win'
        ganancia = apuesta * 2
        exp = Math.floor(apuesta / 80)
    } else if (totalJugador < totalCrupier) {
        resultado = 'lose'
        ganancia = -apuesta
        exp = 5
    } else {
        resultado = 'push'
        ganancia = 0
        exp = 10
    }

    const newMoney = money + ganancia
    updateUser(username, { money: newMoney })
    addExp(username, exp)

    return {
        success: true,
        resultado,
        jugador: { cartas: jugador, total: totalJugador, blackjack: blackjackJugador },
        crupier: { cartas: crupier, total: totalCrupier, blackjack: blackjackCrupier },
        apuesta,
        ganancia,
        exp,
        newMoney
    }
}

// ── Tragamonedas ───────────────────────────────────────────────
export function tragamonedas(username, apuesta) {
    const user = getOrCreateUser(username)
    const money = user.money || 0

    if (apuesta > money) return { success: false, error: 'No tienes suficiente dinero' }
    if (apuesta < 50) return { success: false, error: 'Apuesta mínima: $50' }

    const simbolos = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🔔', '⭐', '🃏']
    const valores = { '🍒': 2, '🍋': 3, '🍇': 4, '💎': 10, '7️⃣': 25, '🔔': 15, '⭐': 20, '🃏': 50 }

    const rodillo = () => simbolos[Math.floor(Math.random() * simbolos.length)]

    const r1 = rodillo()
    const r2 = rodillo()
    const r3 = rodillo()

    let ganancia = 0
    let exp = 0
    let multiplicador = 0

    if (r1 === r2 && r2 === r3) {
        // Jackpot - 3 iguales
        multiplicador = valores[r1] || 2
        ganancia = apuesta * multiplicador
        exp = Math.floor(apuesta / 30)
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
        // 2 iguales
        multiplicador = 1.5
        ganancia = Math.floor(apuesta * 1.5)
        exp = Math.floor(apuesta / 100)
    } else {
        // Nada
        ganancia = -apuesta
        exp = 2
    }

    const newMoney = money + ganancia
    updateUser(username, { money: newMoney })
    addExp(username, exp)

    return {
        success: true,
        rodillos: [r1, r2, r3],
        ganancia,
        exp,
        multiplicador,
        apuesta,
        newMoney
    }
}

// ── Carrera de caballos ────────────────────────────────────────
export function carreraCaballos(username, apuesta, caballoElegido) {
    const user = getOrCreateUser(username)
    const money = user.money || 0

    if (apuesta > money) return { success: false, error: 'No tienes suficiente dinero' }
    if (apuesta < 100) return { success: false, error: 'Apuesta mínima: $100' }
    if (caballoElegido < 1 || caballoElegido > 5) return { success: false, error: 'Elige un caballo del 1 al 5' }

    const caballos = [
        { nombre: '🐎 Trueno',     odds: 1.5 },
        { nombre: '🐎 Relámpago',  odds: 2.0 },
        { nombre: '🐎 Tormenta',   odds: 3.0 },
        { nombre: '🐎 Huracán',    odds: 5.0 },
        { nombre: '🐎 Terremoto',  odds: 8.0 },
    ]

    // Simular carrera con probabilidades ponderadas
    const totalWeight = caballos.reduce((sum, c) => sum + (1 / c.odds), 0)
    let roll = Math.random() * totalWeight
    let ganador = 0

    for (let i = 0; i < caballos.length; i++) {
        roll -= (1 / caballos[i].odds)
        if (roll <= 0) {
            ganador = i
            break
        }
    }

    const acertado = (ganador + 1) === caballoElegido
    let ganancia = 0
    let exp = 0

    if (acertado) {
        ganancia = Math.floor(apuesta * caballos[caballoElegido - 1].odds)
        exp = Math.floor(apuesta / 60)
    } else {
        ganancia = -apuesta
        exp = 3
    }

    const newMoney = money + ganancia
    updateUser(username, { money: newMoney })
    addExp(username, exp)

    return {
        success: true,
        acertado,
        ganador: ganador + 1,
        caballoGanador: caballos[ganador].nombre,
        caballoElegido,
        odds: caballos[caballoElegido - 1].odds,
        apuesta,
        ganancia,
        exp,
        newMoney
    }
}

// ── Formatear resultados ───────────────────────────────────────
export function formatGameResult(game, result) {
    if (!result.success) return `❌ *Error:* ${result.error}`

    let txt = ''

    switch(game) {
        case 'ruleta':
            txt += `🔫 *RULETA RUSA*

`
            txt += `💰 Apuesta: $${result.apuesta.toLocaleString()}
`
            txt += `🎲 Tambor: ${result.gatillo}/6 | Bala: ${result.bala}/6

`
            if (result.muerto) {
                txt += `💀 *¡BANG!* La bala estaba en la recámara...
`
                txt += `😵 Has muerto. Perdiste $${result.apuesta.toLocaleString()}
`
            } else {
                txt += `😅 *¡CLICK!* Sobreviviste...
`
                txt += `💵 Ganaste: $${result.ganancia.toLocaleString()}
`
            }
            txt += `✨ EXP: +${result.exp}
`
            break

        case 'dados':
            txt += `🎲 *DADOS*

`
            txt += `💰 Apuesta: $${result.apuesta.toLocaleString()}
`
            txt += `🎯 Tu número: ${result.numeroElegido}
`
            txt += `🎲 Resultado: ${result.dado}

`
            if (result.acertado) {
                txt += `🎉 *¡ACERTASTE!*
`
                txt += `💵 Ganaste: $${result.ganancia.toLocaleString()} (5x)
`
            } else {
                txt += `😔 Fallaste...
`
                txt += `💸 Perdiste: $${result.apuesta.toLocaleString()}
`
            }
            txt += `✨ EXP: +${result.exp}
`
            break

        case 'blackjack':
            txt += `🃏 *BLACKJACK*

`
            txt += `💰 Apuesta: $${result.apuesta.toLocaleString()}
`
            txt += `🎴 Tú: ${result.jugador.cartas.join(' ')} = ${result.jugador.total}
`
            txt += `🎴 Crupier: ${result.crupier.cartas.join(' ')} = ${result.crupier.total}

`

            switch(result.resultado) {
                case 'blackjack':
                    txt += `🎉 *¡BLACKJACK!*
💵 Ganaste: $${result.ganancia.toLocaleString()}
`; break
                case 'win':
                    txt += `✅ *¡Ganaste!*
💵 Ganaste: $${result.ganancia.toLocaleString()}
`; break
                case 'lose':
                    txt += `❌ *Perdiste...*
💸 Perdiste: $${result.apuesta.toLocaleString()}
`; break
                case 'bust':
                    txt += `💥 *Te pasaste de 21*
💸 Perdiste: $${result.apuesta.toLocaleString()}
`; break
                case 'push':
                    txt += `🤝 *Empate*
💵 Recuperas tu apuesta
`; break
            }
            txt += `✨ EXP: +${result.exp}
`
            break

        case 'slots':
            txt += `🎰 *TRAGAMONEDAS*

`
            txt += `💰 Apuesta: $${result.apuesta.toLocaleString()}
`
            txt += `━━━━━━━━━━━━━━
`
            txt += `   ${result.rodillos.join(' | ')}
`
            txt += `━━━━━━━━━━━━━━

`
            if (result.ganancia > 0) {
                txt += `🎉 *¡GANASTE!*
`
                txt += `💵 Ganancia: $${result.ganancia.toLocaleString()} (${result.multiplicador}x)
`
            } else {
                txt += `😔 No hubo suerte esta vez...
`
                txt += `💸 Perdiste: $${result.apuesta.toLocaleString()}
`
            }
            txt += `✨ EXP: +${result.exp}
`
            break

        case 'caballos':
            txt += `🏇 *CARRERA DE CABALLOS*

`
            txt += `💰 Apuesta: $${result.apuesta.toLocaleString()}
`
            txt += `🐎 Tu caballo: #${result.caballoElegido}
`
            txt += `🏆 Ganador: ${result.caballoGanador}

`
            if (result.acertado) {
                txt += `🎉 *¡TU CABALLO GANÓ!*
`
                txt += `💵 Ganaste: $${result.ganancia.toLocaleString()} (${result.odds}x)
`
            } else {
                txt += `😔 Tu caballo no ganó...
`
                txt += `💸 Perdiste: $${result.apuesta.toLocaleString()}
`
            }
            txt += `✨ EXP: +${result.exp}
`
            break
    }

    txt += `
💵 Balance: $${result.newMoney.toLocaleString()}`
    return txt
}
