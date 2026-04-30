/**
 * Adaptador de librerías Pokémon - Centraliza acceso a lib/pokemon/
 * Mantiene compatibilidad con imports anteriores
 */

// Re-exportar desde la ubicación correcta
export { createBattleRequest, acceptBattle, denyBattle, executeAttack, isInBattle, getUserBattle, getPendingRequest, checkCooldown, applySwitch, surrenderBattle } from './battle.js'
export { Pokemon } from './pokemon.js'
export { initUser, getEffectivenessMessage, isInWildBattle, registerPvpBattle, unregisterPvpBattle, normalizeJidForDb, formatNumber, getTypeEmoji } from './utils.js'
export { applyItemEffect, useItem, ITEMS } from './items.js'
export { calculateCatchXp } from './catchMath.js'
export { getSpanishName } from './data.js'
export { WildBattle } from './wildBattle.js'
export { generateRandomPokemon } from './api.js'
