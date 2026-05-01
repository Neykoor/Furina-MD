// Fórmulas de captura y XP - Centralizadas

const BASE_CATCH_RATE = 0.35
const BALL_MULTIPLIERS = {
    pokeball: 1.0,
    greatball: 1.5,
    ultraball: 2.0,
    masterball: 255.0
}

export function calculateCatchRate(currentHp, maxHp, ballId) {
    const hpFactor = 1 - (currentHp / maxHp) * 0.5
    const ballMultiplier = BALL_MULTIPLIERS[ballId] || 1.0
    return Math.min(0.99, BASE_CATCH_RATE * hpFactor * ballMultiplier)
}

export function calculateCatchXp(pokemon) {
    let baseXp = 10
    baseXp += pokemon.level * 2
    if (pokemon.shiny) baseXp *= 3
    return Math.floor(baseXp)
}