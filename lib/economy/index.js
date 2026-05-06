// lib/economy/index.js
// ════════════════════════════════════════════════════════════════
// EXPORT CENTRAL DEL SISTEMA DE ECONOMÍA RPG
// ════════════════════════════════════════════════════════════════

// Items y catálogo
export { 
    MINERALES, PECES, ANIMALES, MATERIALES, 
    RECETAS_CRAFTEO, TIENDA_ITEMS, RAREZA_INFO,
    getItem, getItemsByCategory, rollItem, formatRareza 
} from './items.js'

// Inventario
export {
    getInventory, addItem, removeItem, 
    equipItem, unequipItem, getEquippedItems, getEquipmentBonus,
    useDurability, canCraft, craftItem, sellItem, formatInventory
} from './inventory.js'

// Misiones
export {
    MISIONES_POOL, getActiveMissions, generateDailyMissions,
    generateWeeklyMissions, initAchievements, updateMissionProgress,
    claimMissionReward, formatMissions
} from './missions.js'

// Estadísticas
export {
    RANGOS, getRango, updateStats, getFormattedStats, getRangoBonus
} from './stats.js'

// Combate
export {
    JEFES, getCombatStats, huntBattle, bossBattle, formatBattleResult
} from './combat.js'

// Juegos
export {
    ruletaRusa, jugarDados, blackjack, tragamonedas, carreraCaballos,
    formatGameResult
} from './games.js'
