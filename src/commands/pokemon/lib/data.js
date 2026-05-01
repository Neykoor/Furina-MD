/**
 * Datos de Kanto - Ampliado a 100 Pokémon comunes (y soporte para los 151)
 */

// Lista completa de los 151 Pokémon de Kanto (por ID)
export const ALL_KANTO = Array.from({ length: 151 }, (_, i) => i + 1)

// Pokémon comunes (ahora 100) - excluyendo algunos muy raros o legendarios
export const COMMON_KANTO = [
    // 1-9: Starters y evoluciones
    1, 2, 3, 4, 5, 6, 7, 8, 9,
    // 10-18: Bichos y pájaros iniciales
    10, 11, 12, 13, 14, 15, 16, 17, 18,
    // 19-26: Ratas, pájaros, pikachu
    19, 20, 21, 22, 23, 24, 25, 26,
    // 27-34: Sandshrew, Nidoran
    27, 28, 29, 30, 31, 32, 33, 34,
    // 35-49: Clefairy, Vulpix, Jigglypuff, Zubat, Oddish, Paras, Venonat
    35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    // 50-68: Diglett, Meowth, Psyduck, Mankey, Growlithe, Poliwag, Abra, Machop, Bellsprout, Tentacool, Geodude, Ponyta, Slowpoke, Magnemite, Doduo, Seel, Grimer, Shellder
    50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
    // 69-85: Bellsprout evo, Tentacruel, Geodude evo, Ponyta evo, Slowbro, Magneton, Farfetch'd, Dodrio, Seel evo, Grimer evo, Shellder evo, Gastly, Haunter, Gengar, Onix, Drowzee, Hypno
    69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97,
    // 98-110: Krabby, Kingler, Voltorb, Electrode, Exeggcute, Exeggutor, Cubone, Marowak, Hitmonlee, Hitmonchan, Lickitung, Koffing, Weezing, Rhyhorn, Rhydon, Chansey, Tangela, Kangaskhan, Horsea, Seadra, Goldeen, Seaking, Staryu, Starmie
    98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121,
    // 122-135: Mr. Mime, Scyther, Jynx, Electabuzz, Magmar, Pinsir, Tauros, Magikarp, Gyarados, Lapras, Ditto, Eevee, Vaporeon, Jolteon, Flareon
    122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135,
    // 136-151: Porygon, Omanyte, Omastar, Kabuto, Kabutops, Aerodactyl, Snorlax, Articuno, Zapdos, Moltres, Dratini, Dragonair, Dragonite, Mewtwo, Mew
    136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151
]

// Para compatibilidad con código existente
export const KANTO_POKEMON = {
    COMMON: COMMON_KANTO,
    ALL: ALL_KANTO
}

// Nombres en español (ampliados hasta 151)
export const SPANISH_NAMES = {
    // 1-9
    1: 'Bulbasaur', 2: 'Ivysaur', 3: 'Venusaur',
    4: 'Charmander', 5: 'Charmeleon', 6: 'Charizard',
    7: 'Squirtle', 8: 'Wartortle', 9: 'Blastoise',
    // 10-18
    10: 'Caterpie', 11: 'Metapod', 12: 'Butterfree',
    13: 'Weedle', 14: 'Kakuna', 15: 'Beedrill',
    16: 'Pidgey', 17: 'Pidgeotto', 18: 'Pidgeot',
    // 19-26
    19: 'Rattata', 20: 'Raticate', 21: 'Spearow', 22: 'Fearow',
    23: 'Ekans', 24: 'Arbok', 25: 'Pikachu', 26: 'Raichu',
    // 27-34
    27: 'Sandshrew', 28: 'Sandslash', 29: 'Nidoran♀', 30: 'Nidorina',
    31: 'Nidoqueen', 32: 'Nidoran♂', 33: 'Nidorino', 34: 'Nidoking',
    // 35-49
    35: 'Clefairy', 36: 'Clefable', 37: 'Vulpix', 38: 'Ninetales',
    39: 'Jigglypuff', 40: 'Wigglytuff', 41: 'Zubat', 42: 'Golbat',
    43: 'Oddish', 44: 'Gloom', 45: 'Vileplume', 46: 'Paras', 47: 'Parasect',
    48: 'Venonat', 49: 'Venomoth',
    // 50-68
    50: 'Diglett', 51: 'Dugtrio', 52: 'Meowth', 53: 'Persian',
    54: 'Psyduck', 55: 'Golduck', 56: 'Mankey', 57: 'Primeape',
    58: 'Growlithe', 59: 'Arcanine', 60: 'Poliwag', 61: 'Poliwhirl',
    62: 'Poliwrath', 63: 'Abra', 64: 'Kadabra', 65: 'Alakazam',
    66: 'Machop', 67: 'Machoke', 68: 'Machamp',
    // 69-85
    69: 'Bellsprout', 70: 'Weepinbell', 71: 'Victreebel', 72: 'Tentacool',
    73: 'Tentacruel', 74: 'Geodude', 75: 'Graveler', 76: 'Golem',
    77: 'Ponyta', 78: 'Rapidash', 79: 'Slowpoke', 80: 'Slowbro',
    81: 'Magnemite', 82: 'Magneton', 83: 'Farfetch\'d', 84: 'Doduo',
    85: 'Dodrio', 86: 'Seel', 87: 'Dewgong', 88: 'Grimer', 89: 'Muk',
    90: 'Shellder', 91: 'Cloyster', 92: 'Gastly', 93: 'Haunter',
    94: 'Gengar', 95: 'Onix', 96: 'Drowzee', 97: 'Hypno',
    // 98-121
    98: 'Krabby', 99: 'Kingler', 100: 'Voltorb', 101: 'Electrode',
    102: 'Exeggcute', 103: 'Exeggutor', 104: 'Cubone', 105: 'Marowak',
    106: 'Hitmonlee', 107: 'Hitmonchan', 108: 'Lickitung', 109: 'Koffing',
    110: 'Weezing', 111: 'Rhyhorn', 112: 'Rhydon', 113: 'Chansey',
    114: 'Tangela', 115: 'Kangaskhan', 116: 'Horsea', 117: 'Seadra',
    118: 'Goldeen', 119: 'Seaking', 120: 'Staryu', 121: 'Starmie',
    // 122-135
    122: 'Mr. Mime', 123: 'Scyther', 124: 'Jynx', 125: 'Electabuzz',
    126: 'Magmar', 127: 'Pinsir', 128: 'Tauros', 129: 'Magikarp',
    130: 'Gyarados', 131: 'Lapras', 132: 'Ditto', 133: 'Eevee',
    134: 'Vaporeon', 135: 'Jolteon',
    // 136-151
    136: 'Flareon', 137: 'Porygon', 138: 'Omanyte', 139: 'Omastar',
    140: 'Kabuto', 141: 'Kabutops', 142: 'Aerodactyl', 143: 'Snorlax',
    144: 'Articuno', 145: 'Zapdos', 146: 'Moltres', 147: 'Dratini',
    148: 'Dragonair', 149: 'Dragonite', 150: 'Mewtwo', 151: 'Mew'
}

export function getRandomPokemon() {
    const id = KANTO_POKEMON.COMMON[Math.floor(Math.random() * KANTO_POKEMON.COMMON.length)]
    return id
}

export function getSpanishName(id) {
    return SPANISH_NAMES[id] || `Pokémon #${id}`
}

export function getEvolutionLine(id) {
    // Líneas evolutivas ampliadas (opcional, se puede expandir más)
    const lines = [
        [1, 2, 3], [4, 5, 6], [7, 8, 9],
        [10, 11, 12], [13, 14, 15], [16, 17, 18],
        [19, 20], [21, 22], [23, 24], [25, 26],
        [27, 28], [29, 30, 31], [32, 33, 34],
        [35, 36], [37, 38], [39, 40], [41, 42],
        [43, 44, 45], [46, 47], [48, 49], [50, 51],
        [52, 53], [54, 55], [56, 57], [58, 59],
        [60, 61, 62], [63, 64, 65], [66, 67, 68],
        [69, 70, 71], [72, 73], [74, 75, 76],
        [77, 78], [79, 80], [81, 82], [83],
        [84, 85], [86, 87], [88, 89], [90, 91],
        [92, 93, 94], [95], [96, 97], [98, 99],
        [100, 101], [102, 103], [104, 105], [106, 107],
        [108], [109, 110], [111, 112], [113], [114],
        [115], [116, 117], [118, 119], [120, 121],
        [122], [123], [124], [125], [126], [127],
        [128], [129, 130], [131], [132], [133, 134, 135, 136],
        [137], [138, 139], [140, 141], [142], [143],
        [144], [145], [146], [147, 148, 149], [150], [151]
    ]
    for (const line of lines) {
        if (line.includes(id)) return line
    }
    return [id]
}