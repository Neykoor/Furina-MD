/**
 * Sistema de Rutas de Kanto - Completo con rutas numeradas y especiales
 */

export const ROUTES = {
    // Rutas numeradas 1-25
    1: { name: 'Ruta 1', minLevel: 2, maxLevel: 5, pokemon: [16, 19, 10, 13] },
    2: { name: 'Ruta 2', minLevel: 3, maxLevel: 6, pokemon: [16, 19, 10, 13, 21] },
    3: { name: 'Ruta 3', minLevel: 5, maxLevel: 8, pokemon: [16, 21, 23, 27, 29, 32] },
    4: { name: 'Ruta 4', minLevel: 7, maxLevel: 10, pokemon: [16, 19, 21, 23, 27, 29, 32, 41] },
    5: { name: 'Ruta 5', minLevel: 10, maxLevel: 13, pokemon: [16, 19, 21, 23, 39, 43, 50] },
    6: { name: 'Ruta 6', minLevel: 12, maxLevel: 15, pokemon: [16, 19, 21, 39, 43, 50, 54, 60] },
    7: { name: 'Ruta 7', minLevel: 15, maxLevel: 18, pokemon: [16, 20, 22, 37, 43, 50, 52, 56] },
    8: { name: 'Ruta 8', minLevel: 17, maxLevel: 20, pokemon: [16, 20, 22, 37, 43, 50, 52, 56, 58, 66] },
    9: { name: 'Ruta 9', minLevel: 18, maxLevel: 22, pokemon: [20, 22, 23, 27, 29, 32, 41, 56, 66, 74] },
    10: { name: 'Ruta 10', minLevel: 20, maxLevel: 25, pokemon: [20, 22, 41, 74, 81, 88, 98] },
    11: { name: 'Ruta 11', minLevel: 21, maxLevel: 24, pokemon: [20, 22, 41, 81, 88, 98, 102] },
    12: { name: 'Ruta 12', minLevel: 22, maxLevel: 26, pokemon: [16, 20, 22, 41, 81, 88, 98, 102, 114] },
    13: { name: 'Ruta 13', minLevel: 24, maxLevel: 28, pokemon: [16, 20, 22, 41, 81, 88, 98, 102, 114] },
    14: { name: 'Ruta 14', minLevel: 25, maxLevel: 29, pokemon: [16, 20, 22, 41, 81, 88, 98, 102, 114] },
    15: { name: 'Ruta 15', minLevel: 26, maxLevel: 30, pokemon: [16, 20, 22, 41, 81, 88, 98, 102, 114] },
    16: { name: 'Ruta 16', minLevel: 24, maxLevel: 28, pokemon: [20, 22, 41, 81, 88, 98, 102] },
    17: { name: 'Ruta 17', minLevel: 25, maxLevel: 29, pokemon: [20, 22, 41, 81, 88, 98, 102, 114] },
    18: { name: 'Ruta 18', minLevel: 26, maxLevel: 30, pokemon: [20, 22, 41, 81, 88, 98, 102] },
    19: { name: 'Ruta 19 (Agua)', minLevel: 25, maxLevel: 30, pokemon: [72, 90, 116, 118, 120] },
    20: { name: 'Ruta 20 (Agua)', minLevel: 27, maxLevel: 32, pokemon: [72, 90, 116, 118, 120] },
    21: { name: 'Ruta 21 (Agua)', minLevel: 28, maxLevel: 33, pokemon: [72, 90, 116, 118, 120] },
    22: { name: 'Ruta 22', minLevel: 3, maxLevel: 6, pokemon: [19, 21, 23, 29, 32] },
    23: { name: 'Ruta 23', minLevel: 30, maxLevel: 35, pokemon: [20, 22, 41, 81, 88, 98, 102, 114, 115] },
    24: { name: 'Ruta 24', minLevel: 10, maxLevel: 14, pokemon: [16, 19, 21, 23, 43, 50, 60] },
    25: { name: 'Ruta 25', minLevel: 12, maxLevel: 16, pokemon: [16, 19, 21, 23, 43, 50, 60] },
    // Zonas especiales
    mt_moon: { name: 'Monte Moon', minLevel: 8, maxLevel: 12, pokemon: [41, 74, 35, 39] },
    rock_tunnel: { name: 'Túnel Roca', minLevel: 15, maxLevel: 18, pokemon: [41, 74, 95] },
    safari_zone: { name: 'Zona Safari', minLevel: 25, maxLevel: 30, pokemon: [32, 29, 102, 115, 111, 127] },
    pokemon_tower: { name: 'Torre Pokémon', minLevel: 18, maxLevel: 22, pokemon: [92, 93] },
    power_plant: { name: 'Central Eléctrica', minLevel: 30, maxLevel: 35, pokemon: [81, 100, 125] },
    victory_road: { name: 'Camino Victoria', minLevel: 38, maxLevel: 45, pokemon: [41, 74, 95, 66, 67, 77] },
    cerulean_cave: { name: 'Cueva Celeste', minLevel: 55, maxLevel: 65, pokemon: [41, 42, 74, 75, 94, 150] },
    diglett_cave: { name: 'Cueva Diglett', minLevel: 15, maxLevel: 22, pokemon: [50, 51] },
    pokemon_mansion: { name: 'Mansión Pokémon', minLevel: 35, maxLevel: 40, pokemon: [88, 89, 109, 110, 58, 59] },
    cinnabar_island: { name: 'Isla Canela', minLevel: 32, maxLevel: 38, pokemon: [88, 89, 109, 110] }
}

export function getRouteInfo(routeId) {
    return ROUTES[routeId] || ROUTES[1]
}

export function getRandomPokemonByRoute(routeId) {
    const route = getRouteInfo(routeId)
    if (!route || !route.pokemon.length) return 16
    const randomIndex = Math.floor(Math.random() * route.pokemon.length)
    return route.pokemon[randomIndex]
}

export function getRouteLevelRange(routeId) {
    const route = getRouteInfo(routeId)
    return { min: route.minLevel, max: route.maxLevel }
}

export function getAvailableRoutes() {
    return Object.entries(ROUTES).map(([id, data]) => ({ id, name: data.name }))
}