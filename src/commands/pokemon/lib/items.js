/**
 * Sistema de Inventario / Mochila - Pokémon V1
 * Items: Poké Ball, Great Ball, Ultra Ball, Master Ball, Poción, Superpoción, Revivir, Caramelo Raro
 */

import { XP_TABLE } from './pokemon.js'  // ✅ Importación estática (sin dependencia circular)

export const ITEMS = {
    // Balls
    pokeball: {
        id: 'pokeball',
        name: '🔴 Poké Ball',
        type: 'ball',
        description: 'Ball básica para capturar Pokémon',
        effect: 'catch',
        catchRate: 1.0,
        emoji: '🔴'
    },
    greatball: {
        id: 'greatball',
        name: '🔵 Great Ball',
        type: 'ball',
        description: 'Ball de buena calidad. Mayor tasa de captura.',
        effect: 'catch',
        catchRate: 1.5,
        emoji: '🔵'
    },
    ultraball: {
        id: 'ultraball',
        name: '🟡 Ultra Ball',
        type: 'ball',
        description: 'Ball de alta calidad. Alta tasa de captura.',
        effect: 'catch',
        catchRate: 2.0,
        emoji: '🟡'
    },
    masterball: {
        id: 'masterball',
        name: '🟣 Master Ball',
        type: 'ball',
        description: 'La mejor Ball. Captura garantizada.',
        effect: 'catch',
        catchRate: 255.0,
        emoji: '🟣'
    },
    // Pociones y curación
    potion: {
        id: 'potion',
        name: '🧪 Poción',
        type: 'heal',
        description: 'Cura 20 HP',
        effect: 'heal_hp',
        value: 20,
        emoji: '🧪'
    },
    superpotion: {
        id: 'superpotion',
        name: '💚 Superpoción',
        type: 'heal',
        description: 'Cura 50 HP',
        effect: 'heal_hp',
        value: 50,
        emoji: '💚'
    },
    revive: {
        id: 'revive',
        name: '💛 Revivir',
        type: 'revive',
        description: 'Revive un Pokémon debilitado con 50% HP',
        effect: 'revive',
        emoji: '💛'
    },
    rare_candy: {
        id: 'rare_candy',
        name: '🍬 Caramelo Raro',
        type: 'xp',
        description: 'Aumenta el nivel de un Pokémon en 1',
        effect: 'level_up',
        emoji: '🍬'
    }
}

export const DEFAULT_INVENTORY = {
    pokeball: 5
}

export function initInventory(user) {
    if (!user.pokemonV1) {
        user.pokemonV1 = { team: [], box: [], caught: 0, released: 0, trained: 0, totalXpGained: 0 }
    }
    if (!user.pokemonV1.inventory) {
        user.pokemonV1.inventory = { ...DEFAULT_INVENTORY }
    }
    return user.pokemonV1.inventory
}

export function getItemCount(user, itemId) {
    const inv = user.pokemonV1?.inventory || {}
    return inv[itemId] || 0
}

export function addItem(user, itemId, amount = 1) {
    const inv = initInventory(user)
    inv[itemId] = (inv[itemId] || 0) + amount
    return inv[itemId]
}

export function useItem(user, itemId, amount = 1) {
    const inv = user.pokemonV1?.inventory
    if (!inv || !inv[itemId] || inv[itemId] < amount) return false
    inv[itemId] -= amount
    if (inv[itemId] <= 0) delete inv[itemId]
    return true
}

export function applyItemEffect(pokemon, itemId) {
    const item = ITEMS[itemId]
    if (!item) return { success: false, message: 'Item desconocido' }

    switch (item.effect) {
        case 'heal_hp': {
            const maxHp = pokemon.stats.maxHp
            if (pokemon.currentHp >= maxHp) {
                return { success: false, message: `${pokemon.displayName} ya tiene HP completo` }
            }
            const healed = Math.min(item.value, maxHp - pokemon.currentHp)
            pokemon.currentHp = Math.min(maxHp, pokemon.currentHp + item.value)
            return { success: true, message: `${pokemon.displayName} recuperó ${healed} HP`, healed }
        }
        case 'revive': {
            if (pokemon.currentHp > 0) {
                return { success: false, message: `${pokemon.displayName} no está debilitado` }
            }
            const maxHp = pokemon.stats.maxHp
            pokemon.currentHp = Math.floor(maxHp * 0.5)
            return { success: true, message: `${pokemon.displayName} fue revivido con ${pokemon.currentHp} HP` }
        }
        case 'level_up': {
            if (pokemon.level >= 100) {
                return { success: false, message: `${pokemon.displayName} ya está en nivel máximo (100)` }
            }
            const oldLevel = pokemon.level
            pokemon.level++
            pokemon.recalculateStats()
            // Ajustar XP al mínimo del nuevo nivel usando la tabla importada
            pokemon.xp = XP_TABLE[pokemon.level] || 0
            pokemon.xpToNext = pokemon.calculateXpToNext()
            return {
                success: true,
                message: `${pokemon.displayName} subió del nivel ${oldLevel} al ${pokemon.level} 🎉`,
                leveledUp: true,
                newLevel: pokemon.level
            }
        }
        default:
            return { success: false, message: 'Efecto no implementado' }
    }
}

export function formatInventory(inventory, itemsDb = ITEMS) {
    const lines = []
    let totalItems = 0
    for (const [itemId, qty] of Object.entries(inventory)) {
        if (qty <= 0) continue
        const item = itemsDb[itemId]
        if (!item) continue
        lines.push(`${item.emoji} ${item.name}: ${qty}`)
        totalItems += qty
    }
    return { lines, totalItems }
}