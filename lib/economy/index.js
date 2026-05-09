// IMPORTANTE: Este archivo es un barrel (export centralizado).
// NUNCA importar desde aquí dentro de los módulos de lib/economy/
// para evitar dependencias circulares.
// Siempre usar imports directos entre archivos.

export { 
    MINERALES, PECES, ANIMALES, MATERIALES, 
    RECETAS_CRAFTEO, TIENDA_ITEMS, RAREZA_INFO,
    getItem, getItemsByCategory, rollItem, formatRareza 
} from './items.js'

export {
    getInventory, addItem, removeItem, 
    equipItem, unequipItem, getEquippedItems, getEquipmentBonus,
    useDurability, canCraft, craftItem, sellItem
} from './inventory.js'

export {
    MISIONES_POOL, getActiveMissions, generateDailyMissions,
    generateWeeklyMissions, initAchievements, updateMissionProgress,
    claimMissionReward, formatMissions
} from './missions.js'

export {
    RANGOS, getRango, updateStats, getFormattedStats, getRangoBonus
} from './stats.js'

export {
    JEFES, getCombatStats, huntBattle, bossBattle, formatBattleResult
} from './combat.js'

export {
    ruletaRusa, jugarDados, blackjack, tragamonedas, carreraCaballos,
    formatGameResult
} from './games.js'
