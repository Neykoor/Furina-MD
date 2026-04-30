/**
 * Módulo: WildBattle - Lógica de combate contra Pokémon salvaje
 * Encapsula el estado y las acciones de una batalla PvE.
 */

import { Pokemon } from './pokemon.js'
import { getTypeMultiplier, getEffectivenessMessage } from './typeChart.js'
import { ITEMS } from './items.js'
import { calculateCatchRate, calculateCatchXp } from './catchMath.js'

const MOVE_POWER = 60

// Fórmula de daño balanceada (compartida entre jugador y salvaje)
export function calculateDamage(attacker, defender) {
    const level = attacker.level
    const attackStat = attacker.stats.attack
    const defenseStat = defender.stats.defense
    const moveType = attacker.types[0] || 'normal'
    const typeMultiplier = getTypeMultiplier(moveType, defender.types)

    const baseDamage = Math.floor(
        ((2 * level / 5 + 2) * MOVE_POWER * attackStat) / defenseStat / 50
    ) + 2

    return Math.max(1, Math.floor(baseDamage * typeMultiplier))
}

export class WildBattle {
    constructor(encounterId, userId, wildPokemon, playerPokemon) {
        this.id = encounterId
        this.userId = userId
        this.wild = wildPokemon
        this.player = playerPokemon
        this.status = 'active'       // 'active', 'battling', 'caught', 'fled'
        this.currentTurn = null      // 'player' o 'wild'
        this.lastActionTime = Date.now()
        this.createdAt = Date.now()
    }

    // Inicia la batalla, determina quién ataca primero según velocidad
    startBattle() {
        if (this.status !== 'active') return { error: 'Estado inválido' }
        this.status = 'battling'
        this.currentTurn = this.player.stats.speed >= this.wild.stats.speed ? 'player' : 'wild'

        // Si el salvaje ataca primero, aplica daño inmediato
        if (this.currentTurn === 'wild') {
            const damage = calculateDamage(this.wild, this.player)
            this.player.currentHp = Math.max(0, this.player.currentHp - damage)
            return {
                firstStrike: 'wild',
                damage,
                playerHp: this.player.currentHp,
                playerMaxHp: this.player.stats.maxHp
            }
        }
        return { firstStrike: 'player', damage: 0 }
    }

    // Ejecuta un ataque del jugador
    playerAttack() {
        if (this.status !== 'battling') return { error: 'No estás en batalla' }
        if (this.currentTurn !== 'player') return { error: 'No es tu turno' }

        // Ataque del jugador
        const playerDamage = calculateDamage(this.player, this.wild)
        const effectiveness = getTypeMultiplier(this.player.types[0] || 'normal', this.wild.types)
        this.wild.currentHp = Math.max(0, this.wild.currentHp - playerDamage)

        let result = {
            action: 'attack',
            playerDamage,
            effectiveness,
            wildHp: this.wild.currentHp,
            wildMaxHp: this.wild.stats.maxHp,
            wildFainted: this.wild.currentHp <= 0
        }

        if (result.wildFainted) {
            this.status = 'fled'
            return result
        }

        // Contraataque del salvaje
        const wildDamage = calculateDamage(this.wild, this.player)
        this.player.currentHp = Math.max(0, this.player.currentHp - wildDamage)

        result.wildDamage = wildDamage
        result.playerHp = this.player.currentHp
        result.playerMaxHp = this.player.stats.maxHp
        result.playerFainted = this.player.currentHp <= 0

        if (result.playerFainted) {
            this.status = 'fled'
        } else {
            this.currentTurn = 'player' // Sigue siendo turno del jugador
            this.lastActionTime = Date.now()
        }

        return result
    }

    // Usar un item (solo pociones, etc., no balls)
    useItem(itemId) {
        if (this.status !== 'battling') return { error: 'No estás en batalla' }
        if (this.currentTurn !== 'player') return { error: 'No es tu turno' }

        const item = ITEMS[itemId]
        if (!item || item.type === 'ball') return { error: 'Item no válido para usar en batalla' }

        // Aplicar efecto del item
        let effectMessage = ''
        if (itemId === 'potion') {
            const heal = 20
            this.player.currentHp = Math.min(this.player.stats.maxHp, this.player.currentHp + heal)
            effectMessage = `Recuperaste ${heal} HP.`
        } else {
            return { error: `Item ${item.name} no implementado en batalla` }
        }

        // Contraataque del salvaje después del item
        const wildDamage = calculateDamage(this.wild, this.player)
        this.player.currentHp = Math.max(0, this.player.currentHp - wildDamage)

        const result = {
            action: 'useItem',
            itemId,
            effectMessage,
            wildDamage,
            playerHp: this.player.currentHp,
            playerMaxHp: this.player.stats.maxHp,
            playerFainted: this.player.currentHp <= 0
        }

        if (result.playerFainted) {
            this.status = 'fled'
        } else {
            this.currentTurn = 'player'
            this.lastActionTime = Date.now()
        }

        return result
    }

    // Cambiar Pokémon activo
    switchPokemon(newPokemon, oldPokemon) {
        if (this.status !== 'battling') return { error: 'No estás en batalla' }
        if (this.currentTurn !== 'player') return { error: 'No es tu turno' }
        if (newPokemon.currentHp <= 0) return { error: `${newPokemon.displayName} está debilitado` }

        this.player = newPokemon

        // El salvaje ataca al nuevo Pokémon
        const wildDamage = calculateDamage(this.wild, this.player)
        this.player.currentHp = Math.max(0, this.player.currentHp - wildDamage)

        const result = {
            action: 'switch',
            oldName: oldPokemon.displayName,
            newName: newPokemon.displayName,
            wildDamage,
            playerHp: this.player.currentHp,
            playerMaxHp: this.player.stats.maxHp,
            playerFainted: this.player.currentHp <= 0
        }

        if (result.playerFainted) {
            this.status = 'fled'
        } else {
            this.currentTurn = 'player'
            this.lastActionTime = Date.now()
        }

        return result
    }

    // Intentar capturar
    attemptCatch(ballId, inventory, addItemToInventoryCallback) {
        if (this.status !== 'battling' && this.status !== 'active') {
            return { error: 'No puedes capturar ahora' }
        }
        if (this.currentTurn === 'wild') {
            return { error: 'Espera tu turno para lanzar la Poké Ball' }
        }

        const catchRate = calculateCatchRate(this.wild.currentHp, this.wild.stats.maxHp, ballId)
        const success = Math.random() < catchRate

        // Consumir la ball (incluso si falla)
        if (!addItemToInventoryCallback) {
            // Simulación: si no hay callback, asumimos que ya se descontó
        }

        if (!success) {
            // Fallo: el salvaje puede atacar o huir
            const fleeChance = 0.3
            const fled = Math.random() < fleeChance
            let wildDamage = 0
            if (!fled && this.status === 'battling') {
                wildDamage = calculateDamage(this.wild, this.player)
                this.player.currentHp = Math.max(0, this.player.currentHp - wildDamage)
                if (this.player.currentHp <= 0) this.status = 'fled'
            }
            return { success: false, fled, wildDamage, playerFainted: this.player.currentHp <= 0 }
        }

        // Éxito
        this.status = 'caught'
        const xpGained = calculateCatchXp(this.wild)
        return { success: true, xpGained }
    }

    // Huir
    run() {
        if (this.status === 'caught') return { error: 'Ya capturaste a este Pokémon' }
        this.status = 'fled'
        return { success: true }
    }

    // Verificar si expiró por tiempo
    isExpired(timeout = 5 * 60 * 1000) {
        return Date.now() - this.lastActionTime > timeout
    }

    // Obtener estado actual para mostrar en mensajes
    getStatusText(playerName, wildName) {
        const playerHpBar = `[${'█'.repeat(Math.max(0, Math.min(10, Math.floor(this.player.currentHp / this.player.stats.maxHp * 10))))}${'░'.repeat(10 - Math.max(0, Math.min(10, Math.floor(this.player.currentHp / this.player.stats.maxHp * 10))))}] ${this.player.currentHp}/${this.player.stats.maxHp}`
        const wildHpBar = `[${'█'.repeat(Math.max(0, Math.min(10, Math.floor(this.wild.currentHp / this.wild.stats.maxHp * 10))))}${'░'.repeat(10 - Math.max(0, Math.min(10, Math.floor(this.wild.currentHp / this.wild.stats.maxHp * 10))))}] ${this.wild.currentHp}/${this.wild.stats.maxHp}`
        return `⚔️ *BATALLA SALVAJE*\n${'═'.repeat(30)}\n🥊 *Tú*: ${this.player.displayName} (Nv.${this.player.level})\n❤️ ${playerHpBar}\n\n🌿 *Salvaje*: ${this.wild.displayName} (Nv.${this.wild.level})\n❤️ ${wildHpBar}\n${'═'.repeat(30)}\n🔄 Turno: ${this.currentTurn === 'player' ? 'Tuyo' : 'Salvaje'}`
    }
}