/**
 * Mapa de Kanto - Rutas y Pokémon disponibles por zona
 */

// Definición de rutas con sus Pokémon (IDs)
export const ROUTES = {
    // Pueblo Paleta (inicio)
    pallet_town: {
        name: 'Pueblo Paleta',
        description: 'Un pequeño pueblo donde comienza tu aventura.',
        pokemon: [16, 19, 10, 13], // Pidgey, Rattata, Caterpie, Weedle
        levelRange: { min: 2, max: 4 }
    },
    route1: {
        name: 'Ruta 1',
        description: 'Camino entre Pueblo Paleta y Ciudad Verde.',
        pokemon: [16, 19, 10, 13, 21, 23], // Añadimos Spearow y Ekans
        levelRange: { min: 2, max: 5 }
    },
    viridian_city: {
        name: 'Ciudad Verde',
        description: 'Ciudad con un gimnasio de tipo tierra.',
        pokemon: [16, 19, 21, 23, 25], // Pikachu aparece aquí
        levelRange: { min: 3, max: 6 }
    },
    route2: {
        name: 'Ruta 2',
        description: 'Bosque al norte de Ciudad Verde.',
        pokemon: [10, 11, 13, 14, 16, 19, 25, 32, 29], // Caterpie, Metapod, Weedle, Kakuna, Pidgey, Rattata, Pikachu, Nidoran♂, Nidoran♀
        levelRange: { min: 3, max: 6 }
    },
    viridian_forest: {
        name: 'Bosque Verde',
        description: 'Un denso bosque lleno de insectos.',
        pokemon: [10, 11, 13, 14, 16, 25, 32, 29, 46, 48], // Añadimos Paras y Venonat
        levelRange: { min: 3, max: 7 }
    },
    pewter_city: {
        name: 'Ciudad Plateada',
        description: 'Ciudad rocosa con gimnasio de tipo roca.',
        pokemon: [16, 19, 21, 23, 27, 41, 50], // Sandshrew, Zubat, Diglett
        levelRange: { min: 5, max: 8 }
    },
    route3: {
        name: 'Ruta 3',
        description: 'Montaña al este de Ciudad Plateada.',
        pokemon: [16, 19, 21, 27, 39, 41, 56, 66], // Jigglypuff, Mankey, Machop
        levelRange: { min: 6, max: 9 }
    },
    mt_moon: {
        name: 'Monte Moon',
        description: 'Cueva famosa por sus fósiles y Clefairys.',
        pokemon: [41, 42, 35, 46, 47, 74, 95, 104], // Zubat, Golbat, Clefairy, Paras, Parasect, Geodude, Onix, Cubone
        levelRange: { min: 7, max: 11 }
    },
    cerulean_city: {
        name: 'Ciudad Celeste',
        description: 'Ciudad con un gimnasio de tipo agua.',
        pokemon: [16, 19, 21, 54, 60, 63, 118], // Psyduck, Poliwag, Abra, Goldeen
        levelRange: { min: 8, max: 12 }
    },
    route4: {
        name: 'Ruta 4',
        description: 'Camino entre Monte Moon y Ciudad Celeste.',
        pokemon: [16, 19, 21, 27, 39, 41, 50, 56, 66],
        levelRange: { min: 8, max: 12 }
    },
    route5: {
        name: 'Ruta 5',
        description: 'Camino al sur de Ciudad Celeste.',
        pokemon: [16, 19, 43, 46, 48, 52, 60, 63],
        levelRange: { min: 10, max: 14 }
    },
    route6: {
        name: 'Ruta 6',
        description: 'Camino a Ciudad Vermellón.',
        pokemon: [16, 19, 43, 46, 48, 52, 54, 60],
        levelRange: { min: 10, max: 14 }
    },
    vermilion_city: {
        name: 'Ciudad Vermellón',
        description: 'Ciudad portuaria con gimnasio de tipo eléctrico.',
        pokemon: [16, 19, 21, 50, 60, 66, 81, 100], // Magnemite, Voltorb
        levelRange: { min: 12, max: 16 }
    },
    // ... Se pueden agregar más rutas hasta llegar a la Liga Pokémon
    // Por ahora dejare estas para la beta
}

// Lista de nombres de rutas para autocompletado
export const ROUTE_NAMES = Object.keys(ROUTES)

// Obtener una ruta por su clave
export function getRoute(routeKey) {
    return ROUTES[routeKey] || null
}

// Obtener un Pokémon aleatorio de una ruta
export function getRandomPokemonFromRoute(routeKey) {
    const route = ROUTES[routeKey]
    if (!route) return null
    const pokemonIds = route.pokemon
    const randomId = pokemonIds[Math.floor(Math.random() * pokemonIds.length)]
    return randomId
}

// Obtener nivel aleatorio según el rango de la ruta
export function getRandomLevelForRoute(routeKey) {
    const route = ROUTES[routeKey]
    if (!route) return { min: 2, max: 5 }
    const { min, max } = route.levelRange
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Validar si una ruta existe
export function isValidRoute(routeKey) {
    return ROUTES.hasOwnProperty(routeKey)
}