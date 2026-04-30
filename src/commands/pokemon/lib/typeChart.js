/**
 * Tabla de Efectividad de Tipos (Fase 5)
 * Multiplicador: atacante -> defensor
 * 2.0 = súper efectivo
 * 0.5 = poco efectivo
 * 0.0 = inmune
 * 1.0 = normal
 */

const TYPE_CHART = {
    normal: { rock: 0.5, ghost: 0.0, steel: 0.5 },
    fire: { 
        grass: 2.0, ice: 2.0, bug: 2.0, steel: 2.0,
        fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5
    },
    water: { 
        fire: 2.0, ground: 2.0, rock: 2.0,
        water: 0.5, grass: 0.5, dragon: 0.5
    },
    electric: { 
        water: 2.0, flying: 2.0,
        electric: 0.5, grass: 0.5, ground: 0.0, dragon: 0.5
    },
    grass: { 
        water: 2.0, ground: 2.0, rock: 2.0,
        fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5
    },
    ice: { 
        grass: 2.0, ground: 2.0, flying: 2.0, dragon: 2.0,
        fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5
    },
    fighting: { 
        normal: 2.0, ice: 2.0, rock: 2.0, dark: 2.0, steel: 2.0,
        poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, ghost: 0.0, fairy: 0.5
    },
    poison: { 
        grass: 2.0, fairy: 2.0,
        poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0.0
    },
    ground: { 
        fire: 2.0, electric: 2.0, poison: 2.0, rock: 2.0, steel: 2.0,
        grass: 0.5, bug: 0.5, flying: 0.0
    },
    flying: { 
        grass: 2.0, fighting: 2.0, bug: 2.0,
        electric: 0.5, rock: 0.5, steel: 0.5
    },
    bug: { 
        grass: 2.0, psychic: 2.0, dark: 2.0,
        fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5
    },
    rock: { 
        fire: 2.0, ice: 2.0, flying: 2.0, bug: 2.0,
        fighting: 0.5, ground: 0.5, steel: 0.5
    },
    ghost: { 
        ghost: 2.0, psychic: 2.0,
        normal: 0.0, dark: 0.5
    },
    dragon: { 
        dragon: 2.0,
        steel: 0.5, fairy: 0.0
    },
    psychic: { 
        fighting: 2.0, poison: 2.0,
        psychic: 0.5, steel: 0.5, dark: 0.0
    },
    steel: { 
        ice: 2.0, rock: 2.0, fairy: 2.0,
        fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5
    }
}

/**
 * Calcula el multiplicador de daño según el tipo del movimiento y los tipos del defensor.
 * @param {string} moveType - Tipo del movimiento usado
 * @param {Array<string>} defenderTypes - Tipos del Pokémon defensor
 * @returns {number} Multiplicador (2.0, 0.5, 0.0, 1.0)
 */
export function getTypeMultiplier(moveType, defenderTypes) {
    let multiplier = 1.0
    const chart = TYPE_CHART[moveType] || {}
    
    for (const defType of defenderTypes) {
        if (chart[defType] !== undefined) {
            multiplier *= chart[defType]
        }
    }
    
    return multiplier
}

/**
 * Devuelve un mensaje descriptivo según el multiplicador.
 */
export function getEffectivenessMessage(multiplier) {
    if (multiplier > 1.5) return '💥 ¡Es súper efectivo!'
    if (multiplier > 0.1 && multiplier < 0.9) return '📉 No es muy efectivo...'
    if (multiplier === 0) return '❌ No afecta...'
    return ''
}