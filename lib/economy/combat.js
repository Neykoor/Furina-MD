
import { getOrCreateUser, updateUser, addExp } from '../users.js'
import { getEquippedItems, getEquipmentBonus, useDurability } from './inventory.js'
import { ANIMALES } from './items.js'

export const JEFES = {
    goblin:      { nombre: '👺 Jefe Goblin',      vida: 200,  daño: 25,  defensa: 10, exp: 100,  money: 500,  drops: { oro: 2, hierro: 5 } },
    ogro:        { nombre: '👹 Ogro Salvaje',     vida: 500,  daño: 50,  defensa: 20, exp: 300,  money: 1500, drops: { oro: 5, rubi: 1 } },
    troll:       { nombre: '🧌 Troll de Cueva',   vida: 800,  daño: 70,  defensa: 30, exp: 500,  money: 3000, drops: { esmeralda: 2, hierro: 10 } },
    gigante:     { nombre: '🦶 Gigante de Piedra', vida: 1500, daño: 100, defensa: 50, exp: 1000, money: 7000, drops: { diamante: 1, titanio: 2 } },
    dragon_anciano: { nombre: '🐲 Dragón Anciano', vida: 3000, daño: 200, defensa: 80, exp: 3000, money: 20000, drops: { diamante: 5, obsidiana: 3, oro: 20 } },
    demonio:     { nombre: '👿 Señor Demonio',    vida: 5000, daño: 300, defensa: 100, exp: 5000, money: 50000, drops: { diamante: 10, meteorito: 1, titanio: 5 } },
}

export function getCombatStats(username) {
    const user = getOrCreateUser(username)
    const equipBonus = getEquipmentBonus(username)
    const level = user.level || 1

    const baseVida = 100 + (level * 10)
    const baseDaño = 10 + (level * 2)
    const baseDefensa = 5 + (level * 1)

    return {
        vida: Math.floor(baseVida + equipBonus.defensa * 2),
        daño: Math.floor(baseDaño + equipBonus.daño),
        defensa: Math.floor(baseDefensa + equipBonus.defensa),
        critChance: Math.min(5 + (level * 0.3), 50), // Max 50%
        critMultiplier: 2.0,
        evasion: Math.min(2 + (level * 0.2), 30), // Max 30%
    }
}

export function huntBattle(username, animalId) {
    const animal = ANIMALES[animalId]
    if (!animal) return { success: false, error: 'Animal no encontrado' }

    const playerStats = getCombatStats(username)
    const user = getOrCreateUser(username)

    let playerVida = playerStats.vida
    let animalVida = animal.vida
    let turnos = 0
    const log = []

    if ((user.level || 1) < animal.nivel) {
        return { 
            success: false, 
            error: `Necesitas nivel ${animal.nivel} para cazar ${animal.nombre}`,
            required: animal.nivel,
            current: user.level || 1
        }
    }

    while (playerVida > 0 && animalVida > 0 && turnos < 50) {
        turnos++

        const crit = Math.random() * 100 < playerStats.critChance
        const dañoJugador = Math.max(1, Math.floor(
            (playerStats.daño * (crit ? playerStats.critMultiplier : 1)) - (animal.vida * 0.05)
        ))
        animalVida -= dañoJugador

        log.push({
            turno: turnos,
            actor: 'player',
            daño: dañoJugador,
            crit,
            targetVida: Math.max(0, animalVida)
        })

        if (animalVida <= 0) break

        // Turno del animal
        const evade = Math.random() * 100 < playerStats.evasion
        if (!evade) {
            const dañoAnimal = Math.max(1, Math.floor(
                (animal.vida * 0.1) - (playerStats.defensa * 0.3)
            ))
            playerVida -= dañoAnimal

            log.push({
                turno: turnos,
                actor: 'animal',
                daño: dañoAnimal,
                targetVida: Math.max(0, playerVida)
            })
        } else {
            log.push({
                turno: turnos,
                actor: 'animal',
                evade: true
            })
        }
    }

    const victory = animalVida <= 0

    // Calcular recompensas
    let expGained = 0
    let moneyGained = 0
    let itemsDropped = []

    if (victory) {
        expGained = animal.exp
        moneyGained = animal.valor

        // Bonus por nivel
        const levelBonus = (user.level || 1) * 0.05
        moneyGained = Math.floor(moneyGained * (1 + levelBonus))

        // Posibles drops adicionales
        if (Math.random() < 0.3) {
            // Drop de cuero (para crafteo)
            itemsDropped.push({ item: 'cuero', cantidad: Math.floor(Math.random() * 3) + 1 })
        }
        if (Math.random() < 0.1 && animal.rareza === 'legendario') {
            itemsDropped.push({ item: 'hueso_dragón', cantidad: 1 })
        }
    } else {
        // Derrota: pierde algo de dinero
        moneyGained = -Math.floor((user.money || 0) * 0.05)
        expGained = Math.floor(animal.exp * 0.1)
    }

    return {
        success: true,
        victory,
        animal,
        playerStats,
        turnos,
        log: log.slice(0, 10), // Solo últimos 10 turnos para no spamear
        expGained,
        moneyGained,
        itemsDropped,
        playerVida: Math.max(0, playerVida),
        animalVida: Math.max(0, animalVida)
    }
}

// ── Combate contra jefe ────────────────────────────────────────
export function bossBattle(username, bossId) {
    const jefe = JEFES[bossId]
    if (!jefe) return { success: false, error: 'Jefe no encontrado' }

    const playerStats = getCombatStats(username)
    const user = getOrCreateUser(username)
    const level = user.level || 1

    // Requisito de nivel para jefes
    const nivelRequerido = { goblin: 5, ogro: 15, troll: 25, gigante: 35, dragon_anciano: 45, demonio: 60 }
    if (level < nivelRequerido[bossId]) {
        return { success: false, error: `Necesitas nivel ${nivelRequerido[bossId]} para enfrentar a ${jefe.nombre}` }
    }

    let playerVida = playerStats.vida
    let jefeVida = jefe.vida
    let turnos = 0
    const log = []

    while (playerVida > 0 && jefeVida > 0 && turnos < 100) {
        turnos++

        // Turno del jugador
        const crit = Math.random() * 100 < playerStats.critChance
        const dañoJugador = Math.max(1, Math.floor(
            (playerStats.daño * (crit ? playerStats.critMultiplier : 1)) - (jefe.defensa * 0.5)
        ))
        jefeVida -= dañoJugador

        log.push({ turno: turnos, actor: 'player', daño: dañoJugador, crit, targetVida: Math.max(0, jefeVida) })

        if (jefeVida <= 0) break

        // Turno del jefe (ataque especial cada 3 turnos)
        const special = turnos % 3 === 0
        const evade = Math.random() * 100 < playerStats.evasion

        if (!evade) {
            const dañoJefe = Math.max(1, Math.floor(
                (jefe.daño * (special ? 1.5 : 1)) - (playerStats.defensa * 0.4)
            ))
            playerVida -= dañoJefe

            log.push({ 
                turno: turnos, 
                actor: 'boss', 
                daño: dañoJefe, 
                special,
                targetVida: Math.max(0, playerVida) 
            })
        } else {
            log.push({ turno: turnos, actor: 'boss', evade: true })
        }
    }

    const victory = jefeVida <= 0

    let expGained = 0
    let moneyGained = 0
    let itemsDropped = []

    if (victory) {
        expGained = jefe.exp
        moneyGained = jefe.money

        // Drops garantizados
        for (const [itemId, cantidad] of Object.entries(jefe.drops)) {
            itemsDropped.push({ item: itemId, cantidad })
        }

        // Drop bonus aleatorio
        if (Math.random() < 0.2) {
            const bonusItems = ['poción_vida', 'poción_fuerza', 'cebo_magico']
            itemsDropped.push({ item: bonusItems[Math.floor(Math.random() * bonusItems.length)], cantidad: 1 })
        }
    } else {
        moneyGained = -Math.floor((user.money || 0) * 0.1)
        expGained = Math.floor(jefe.exp * 0.05)
    }

    return {
        success: true,
        victory,
        jefe,
        playerStats,
        turnos,
        log: log.slice(0, 15),
        expGained,
        moneyGained,
        itemsDropped,
        playerVida: Math.max(0, playerVida),
        jefeVida: Math.max(0, jefeVida)
    }
}

// ── Formatear resultado de combate ─────────────────────────────
export function formatBattleResult(result) {
    if (!result.success) return `❌ *Error:* ${result.error}`

    const isBoss = result.jefe
    const enemy = isBoss ? result.jefe : result.animal

    let txt = ''

    if (result.victory) {
        txt += `🎉 *¡VICTORIA!*

`
        txt += `☠️ Has derrotado a ${enemy.nombre}
`
        txt += `⚔️ Turnos: ${result.turnos}

`
        txt += `💰 *Recompensas:*
`
        txt += `   ✨ EXP: +${result.expGained}
`
        txt += `   💵 Dinero: $${result.moneyGained.toLocaleString()}
`

        if (result.itemsDropped && result.itemsDropped.length > 0) {
            txt += `   🎁 Drops:
`
            for (const drop of result.itemsDropped) {
                txt += `      • ${drop.item} x${drop.cantidad}
`
            }
        }
    } else {
        txt += `💀 *DERROTA*

`
        txt += `${enemy.nombre} te ha derrotado...
`
        txt += `⚔️ Turnos: ${result.turnos}

`
        txt += `📉 *Pérdidas:*
`
        txt += `   💵 Dinero perdido: $${Math.abs(result.moneyGained).toLocaleString()}
`
        txt += `   ✨ EXP: +${result.expGained} (consuelo)
`
    }

    return txt
}
