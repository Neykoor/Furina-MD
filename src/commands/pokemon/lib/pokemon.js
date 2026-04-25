/**
 * Clase Pokemon - V5.2 (con lastTrainTime para entrenamiento individual)
 * Estadísticas rebalanceadas + límite nivel 100
 */

import { fetchPokemon } from './api.js'
import { getSpanishName } from './data.js'

const XP_TABLE = {}
for (let i = 1; i <= 100; i++) {
    XP_TABLE[i] = Math.pow(i, 3)
}

const FIXED_IV = 31

export class Pokemon {
    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.displayName = data.displayName || getSpanishName(data.id)

        this.level = data.level || Math.floor(Math.random() * 5) + 1
        this.xp = data.xp || XP_TABLE[this.level] || 0
        this.xpToNext = this.calculateXpToNext()

        this.sprite = data.sprite
        this.shinySprite = data.shinySprite
        this.artwork = data.artwork || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${this.id}.png`
        this.types = data.types || []
        this.shiny = data.shiny || false

        // Guardar stats base
        this.baseStats = data.baseStats ? this.normalizeStats(data.baseStats) : {
            maxHp: 50, attack: 50, defense: 50, speed: 50
        }

        if (data.stats) {
            this.stats = this.normalizeStats(data.stats)
        } else {
            this.stats = this.calculateStats()
        }

        this.currentHp = data.currentHp !== undefined ? data.currentHp : this.stats.maxHp

        this.caughtAt = data.caughtAt || Date.now()
        this.caughtBy = data.caughtBy || null

        // Nuevo: tiempo del último entrenamiento (para cooldown individual)
        this.lastTrainTime = data.lastTrainTime || 0
    }

    normalizeStats(stats) {
        const normalized = { ...stats }
        if (normalized.hp !== undefined && normalized.maxHp === undefined) {
            normalized.maxHp = normalized.hp
            delete normalized.hp
        }
        normalized.maxHp = normalized.maxHp || 50
        normalized.attack = normalized.attack || 50
        normalized.defense = normalized.defense || 50
        normalized.speed = normalized.speed || 50
        return normalized
    }

    calculateStats() {
        const level = this.level
        const baseHp = this.baseStats.maxHp
        const baseAtk = this.baseStats.attack
        const baseDef = this.baseStats.defense
        const baseSpd = this.baseStats.speed

        const maxHp = Math.floor(((2 * baseHp + FIXED_IV) * level) / 100) + level + 10
        const attack = Math.floor(((2 * baseAtk + FIXED_IV) * level) / 100) + 5
        const defense = Math.floor(((2 * baseDef + FIXED_IV) * level) / 100) + 5
        const speed = Math.floor(((2 * baseSpd + FIXED_IV) * level) / 100) + 5

        return { maxHp, attack, defense, speed }
    }

    recalculateStats() {
        const oldMaxHp = this.stats.maxHp
        this.stats = this.calculateStats()
        const hpRatio = oldMaxHp > 0 ? this.currentHp / oldMaxHp : 0
        this.currentHp = Math.floor(this.stats.maxHp * hpRatio)
        if (this.currentHp <= 0) this.currentHp = 1
    }

    calculateXpToNext() {
        const nextLevel = this.level + 1
        if (nextLevel > 100) return null
        return XP_TABLE[nextLevel] - this.xp
    }

    gainXp(amount) {
        if (this.level >= 100) return { leveledUp: false, levelsGained: 0 }
        this.xp += amount
        let levelsGained = 0
        let leveledUp = false
        while (this.level < 100 && this.xp >= XP_TABLE[this.level + 1]) {
            this.level++
            levelsGained++
            leveledUp = true
            this.recalculateStats()
        }
        this.xpToNext = this.calculateXpToNext()
        return { leveledUp, levelsGained, newLevel: this.level }
    }

    getXpBar() {
        if (this.level >= 100) return '[██████████] MAX'
        const currentLevelXp = XP_TABLE[this.level]
        const nextLevelXp = XP_TABLE[this.level + 1]
        const xpInLevel = this.xp - currentLevelXp
        const xpNeeded = nextLevelXp - currentLevelXp
        const percent = Math.floor((xpInLevel / xpNeeded) * 10)
        const filled = '█'.repeat(percent)
        const empty = '░'.repeat(10 - percent)
        return `[${filled}${empty}] ${xpInLevel}/${xpNeeded} XP`
    }

    getXpPercent() {
        if (this.level >= 100) return 100
        const currentLevelXp = XP_TABLE[this.level]
        const nextLevelXp = XP_TABLE[this.level + 1]
        const xpInLevel = this.xp - currentLevelXp
        const xpNeeded = nextLevelXp - currentLevelXp
        return Math.floor((xpInLevel / xpNeeded) * 100)
    }

    getHpBar() {
        const maxHp = this.stats.maxHp || 1
        const percent = Math.floor((this.currentHp / maxHp) * 10)
        const filled = '█'.repeat(Math.max(0, percent))
        const empty = '░'.repeat(10 - percent)
        return `[${filled}${empty}] ${this.currentHp}/${maxHp}`
    }

    static async createWild(pokedexId, forcedLevel = null) {
        const apiData = await fetchPokemon(pokedexId)
        if (!apiData) throw new Error('Failed to fetch Pokemon')

        const shiny = Math.random() < 0.000244140625
        const level = forcedLevel || Math.floor(Math.random() * 5) + 1
        const initialXp = XP_TABLE[level] || 0

        const baseStats = {
            maxHp: apiData.stats.hp,
            attack: apiData.stats.attack,
            defense: apiData.stats.defense,
            speed: apiData.stats.speed
        }

        return new Pokemon({
            id: apiData.id,
            name: apiData.name,
            displayName: getSpanishName(apiData.id),
            level: level,
            xp: initialXp,
            sprite: shiny ? apiData.shinySprite : apiData.sprite,
            shinySprite: apiData.shinySprite,
            artwork: apiData.artwork,
            types: apiData.types,
            shiny: shiny,
            baseStats: baseStats,
            caughtBy: null,
            lastTrainTime: 0
        })
    }

    static fromJSON(data) {
        return new Pokemon(data)
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            displayName: this.displayName,
            level: this.level,
            xp: this.xp,
            sprite: this.sprite,
            shinySprite: this.shinySprite,
            artwork: this.artwork,
            types: this.types,
            shiny: this.shiny,
            baseStats: this.baseStats,
            stats: this.stats,
            currentHp: this.currentHp,
            caughtAt: this.caughtAt,
            caughtBy: this.caughtBy,
            lastTrainTime: this.lastTrainTime
        }
    }
}

export { XP_TABLE }