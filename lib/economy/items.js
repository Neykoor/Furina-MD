// lib/economy/items.js
// ════════════════════════════════════════════════════════════════
// CATÁLOGO COMPLETO DE ITEMS, MINERALES, PECES, ANIMALES, MATERIALES
// ════════════════════════════════════════════════════════════════

// ── Minerales (Minería) ────────────────────────────────────────
export const MINERALES = {
    carbon:     { id: 'carbon',     nombre: '⬛ Carbón',        emoji: '⬛', rareza: 'comun',     valor: 15,  exp: 3,  nivel: 1,  probabilidad: 35 },
    cobre:      { id: 'cobre',      nombre: '🟤 Cobre',         emoji: '🟤', rareza: 'comun',     valor: 25,  exp: 5,  nivel: 1,  probabilidad: 30 },
    hierro:     { id: 'hierro',     nombre: '⚙️ Hierro',        emoji: '⚙️', rareza: 'comun',     valor: 40,  exp: 7,  nivel: 2,  probabilidad: 25 },
    plata:      { id: 'plata',      nombre: '⚪ Plata',         emoji: '⚪', rareza: 'poco_comun',valor: 80,  exp: 12, nivel: 5,  probabilidad: 15 },
    oro:        { id: 'oro',        nombre: '🟡 Oro',           emoji: '🟡', rareza: 'raro',      valor: 200, exp: 25, nivel: 8,  probabilidad: 8 },
    rubi:       { id: 'rubi',       nombre: '🔴 Rubí',          emoji: '🔴', rareza: 'raro',      valor: 350, exp: 35, nivel: 10, probabilidad: 5 },
    zafiro:     { id: 'zafiro',     nombre: '🔵 Zafiro',        emoji: '🔵', rareza: 'raro',      valor: 400, exp: 40, nivel: 12, probabilidad: 4 },
    esmeralda:  { id: 'esmeralda',  nombre: '🟢 Esmeralda',     emoji: '🟢', rareza: 'epico',     valor: 600, exp: 55, nivel: 15, probabilidad: 2 },
    diamante:   { id: 'diamante',   nombre: '💎 Diamante',      emoji: '💎', rareza: 'epico',     valor: 1000,exp: 80, nivel: 18, probabilidad: 1 },
    obsidiana:  { id: 'obsidiana',  nombre: '🖤 Obsidiana',     emoji: '🖤', rareza: 'epico',     valor: 800, exp: 70, nivel: 20, probabilidad: 1 },
    titanio:    { id: 'titanio',    nombre: '🔩 Titanio',       emoji: '🔩', rareza: 'legendario',valor: 1500,exp: 120,nivel: 25, probabilidad: 0.5 },
    meteorito:  { id: 'meteorito',  nombre: '☄️ Meteorito',     emoji: '☄️', rareza: 'legendario',valor: 2500,exp: 200,nivel: 30, probabilidad: 0.2 },
}

// ── Peces (Pesca) ──────────────────────────────────────────────
export const PECES = {
    sardina:       { id: 'sardina',       nombre: '🐟 Sardina',        emoji: '🐟', rareza: 'comun',     valor: 10,  exp: 3,  nivel: 1,  probabilidad: 30 },
    atun:          { id: 'atun',          nombre: '🐠 Atún',           emoji: '🐠', rareza: 'comun',     valor: 25,  exp: 5,  nivel: 1,  probabilidad: 25 },
    salmon:        { id: 'salmon',        nombre: '🐡 Salmón',         emoji: '🐡', rareza: 'comun',     valor: 40,  exp: 7,  nivel: 2,  probabilidad: 20 },
    pez_espada:    { id: 'pez_espada',    nombre: '🗡️ Pez Espada',     emoji: '🗡️', rareza: 'poco_comun',valor: 70,  exp: 12, nivel: 5,  probabilidad: 12 },
    mero:          { id: 'mero',          nombre: '🦈 Mero',           emoji: '🦈', rareza: 'poco_comun',valor: 90,  exp: 15, nivel: 6,  probabilidad: 8 },
    langosta:      { id: 'langosta',      nombre: '🦞 Langosta',       emoji: '🦞', rareza: 'raro',      valor: 150, exp: 20, nivel: 8,  probabilidad: 5 },
    pulpo:         { id: 'pulpo',         nombre: '🐙 Pulpo Gigante',  emoji: '🐙', rareza: 'raro',      valor: 200, exp: 25, nivel: 10, probabilidad: 3 },
    tiburon:       { id: 'tiburon',       nombre: '🦈 Tiburón Blanco', emoji: '🦈', rareza: 'epico',     valor: 500, exp: 50, nivel: 15, probabilidad: 1.5 },
    ballena:       { id: 'ballena',       nombre: '🐋 Ballena Azul',   emoji: '🐋', rareza: 'legendario',valor: 2000,exp: 150,nivel: 25, probabilidad: 0.3 },
    kraken:        { id: 'kraken',        nombre: '🐉 Kraken',         emoji: '🐉', rareza: 'mitico',    valor: 5000,exp: 300,nivel: 35, probabilidad: 0.1 },
}

// ── Animales (Caza) ────────────────────────────────────────────
export const ANIMALES = {
    conejo:      { id: 'conejo',      nombre: '🐰 Conejo',        emoji: '🐰', rareza: 'comun',     valor: 20,  exp: 5,  nivel: 1,  probabilidad: 30, vida: 20 },
    zorro:       { id: 'zorro',       nombre: '🦊 Zorro',         emoji: '🦊', rareza: 'comun',     valor: 35,  exp: 7,  nivel: 2,  probabilidad: 25, vida: 35 },
    ciervo:      { id: 'ciervo',      nombre: '🦌 Ciervo',        emoji: '🦌', rareza: 'comun',     valor: 50,  exp: 10, nivel: 3,  probabilidad: 20, vida: 50 },
    jabali:      { id: 'jabali',      nombre: '🐗 Jabalí',        emoji: '🐗', rareza: 'poco_comun',valor: 80,  exp: 15, nivel: 5,  probabilidad: 15, vida: 80 },
    lobo:        { id: 'lobo',        nombre: '🐺 Lobo',          emoji: '🐺', rareza: 'poco_comun',valor: 100, exp: 18, nivel: 7,  probabilidad: 10, vida: 100 },
    oso:         { id: 'oso',         nombre: '🐻 Oso',           emoji: '🐻', rareza: 'raro',      valor: 200, exp: 30, nivel: 10, probabilidad: 6,  vida: 150 },
    puma:        { id: 'puma',        nombre: '🐆 Puma',          emoji: '🐆', rareza: 'raro',      valor: 250, exp: 35, nivel: 12, probabilidad: 4,  vida: 180 },
    alce:        { id: 'alce',        nombre: '🫎 Alce',          emoji: '🫎', rareza: 'epico',     valor: 400, exp: 50, nivel: 15, probabilidad: 2,  vida: 250 },
    rinoceronte: { id: 'rinoceronte', nombre: '🦏 Rinoceronte',   emoji: '🦏', rareza: 'epico',     valor: 600, exp: 70, nivel: 18, probabilidad: 1,  vida: 350 },
    dragon:      { id: 'dragon',      nombre: '🐲 Dragón',        emoji: '🐲', rareza: 'legendario',valor: 3000,exp: 250,nivel: 30, probabilidad: 0.3, vida: 500 },
    fenix:       { id: 'fenix',       nombre: '🔥 Fénix',         emoji: '🔥', rareza: 'mitico',    valor: 8000,exp: 500,nivel: 40, probabilidad: 0.1, vida: 800 },
}

// ── Materiales de recolección ──────────────────────────────────
export const MATERIALES = {
    madera:      { id: 'madera',      nombre: '🪵 Madera',        emoji: '🪵', rareza: 'comun',     valor: 5,   exp: 2,  nivel: 1,  probabilidad: 40 },
    piedra:      { id: 'piedra',      nombre: '🪨 Piedra',        emoji: '🪨', rareza: 'comun',     valor: 8,   exp: 3,  nivel: 1,  probabilidad: 35 },
    arcilla:     { id: 'arcilla',     nombre: '🟫 Arcilla',       emoji: '🟫', rareza: 'comun',     valor: 10,  exp: 3,  nivel: 1,  probabilidad: 30 },
    fibra:       { id: 'fibra',       nombre: '🌿 Fibra Vegetal', emoji: '🌿', rareza: 'comun',     valor: 12,  exp: 4,  nivel: 2,  probabilidad: 25 },
    corteza:     { id: 'corteza',     nombre: '🌳 Corteza',       emoji: '🌳', rareza: 'poco_comun',valor: 20,  exp: 6,  nivel: 3,  probabilidad: 15 },
    cristal:     { id: 'cristal',     nombre: '💠 Cristal',       emoji: '💠', rareza: 'poco_comun',valor: 35,  exp: 8,  nivel: 5,  probabilidad: 10 },
    perla:       { id: 'perla',       nombre: '⚪ Perla',         emoji: '⚪', rareza: 'raro',      valor: 100, exp: 15, nivel: 8,  probabilidad: 5 },
    ambar:       { id: 'ambar',       nombre: '🟡 Ámbar',         emoji: '🟡', rareza: 'raro',      valor: 120, exp: 18, nivel: 10, probabilidad: 3 },
    resina:      { id: 'resina',      nombre: '🍯 Resina Dorada', emoji: '🍯', rareza: 'epico',     valor: 200, exp: 25, nivel: 12, probabilidad: 2 },
    madera_magica:{ id: 'madera_magica', nombre: '✨ Madera Mágica', emoji: '✨', rareza: 'legendario',valor: 500, exp: 50, nivel: 20, probabilidad: 0.5 },
}

// ── Items crafteables ──────────────────────────────────────────
export const RECETAS_CRAFTEO = {
    // Herramientas
    pico_madera: {
        id: 'pico_madera', nombre: '🪓 Pico de Madera', emoji: '🪓', tipo: 'herramienta',
        requiere: { madera: 10, piedra: 5 }, valor: 50, exp: 10, nivel: 1,
        bonus: { mineria: 1.1, durabilidad: 20 }
    },
    pico_hierro: {
        id: 'pico_hierro', nombre: '⛏️ Pico de Hierro', emoji: '⛏️', tipo: 'herramienta',
        requiere: { madera: 15, hierro: 10, piedra: 10 }, valor: 150, exp: 25, nivel: 3,
        bonus: { mineria: 1.3, durabilidad: 50 }
    },
    pico_oro: {
        id: 'pico_oro', nombre: '🏆 Pico de Oro', emoji: '🏆', tipo: 'herramienta',
        requiere: { madera: 20, oro: 8, hierro: 5 }, valor: 500, exp: 60, nivel: 8,
        bonus: { mineria: 1.6, durabilidad: 80, luck: 1.2 }
    },
    pico_diamante: {
        id: 'pico_diamante', nombre: '💎 Pico de Diamante', emoji: '💎', tipo: 'herramienta',
        requiere: { madera_magica: 5, diamante: 3, titanio: 2 }, valor: 2000, exp: 150, nivel: 20,
        bonus: { mineria: 2.0, durabilidad: 150, luck: 1.5 }
    },
    caña_basica: {
        id: 'caña_basica', nombre: '🎣 Caña Básica', emoji: '🎣', tipo: 'herramienta',
        requiere: { madera: 15, fibra: 10 }, valor: 40, exp: 8, nivel: 1,
        bonus: { pesca: 1.1, durabilidad: 15 }
    },
    caña_oro: {
        id: 'caña_oro', nombre: '🏅 Caña de Oro', emoji: '🏅', tipo: 'herramienta',
        requiere: { madera: 20, oro: 5, fibra: 15 }, valor: 300, exp: 40, nivel: 7,
        bonus: { pesca: 1.4, durabilidad: 60, luck: 1.3 }
    },
    arco_madera: {
        id: 'arco_madera', nombre: '🏹 Arco de Madera', emoji: '🏹', tipo: 'arma',
        requiere: { madera: 20, fibra: 15, piedra: 5 }, valor: 80, exp: 15, nivel: 2,
        bonus: { caza: 1.2, durabilidad: 25, daño: 15 }
    },
    arco_hierro: {
        id: 'arco_hierro', nombre: '🏹 Arco Reforzado', emoji: '🏹', tipo: 'arma',
        requiere: { madera: 25, hierro: 12, fibra: 20 }, valor: 200, exp: 35, nivel: 5,
        bonus: { caza: 1.5, durabilidad: 60, daño: 35 }
    },
    espada_hierro: {
        id: 'espada_hierro', nombre: '⚔️ Espada de Hierro', emoji: '⚔️', tipo: 'arma',
        requiere: { hierro: 15, madera: 10, piedra: 5 }, valor: 180, exp: 30, nivel: 4,
        bonus: { caza: 1.3, durabilidad: 50, daño: 30 }
    },
    espada_diamante: {
        id: 'espada_diamante', nombre: '⚔️ Espada de Diamante', emoji: '⚔️', tipo: 'arma',
        requiere: { diamante: 5, hierro: 10, madera_magica: 3 }, valor: 1500, exp: 100, nivel: 18,
        bonus: { caza: 2.0, durabilidad: 120, daño: 80 }
    },
    // Armaduras
    casco_hierro: {
        id: 'casco_hierro', nombre: '🪖 Casco de Hierro', emoji: '🪖', tipo: 'armadura',
        requiere: { hierro: 10, cuero: 5 }, valor: 120, exp: 20, nivel: 3,
        bonus: { defensa: 10, durabilidad: 40 }
    },
    peto_hierro: {
        id: 'peto_hierro', nombre: '🛡️ Peto de Hierro', emoji: '🛡️', tipo: 'armadura',
        requiere: { hierro: 20, cuero: 10 }, valor: 250, exp: 35, nivel: 5,
        bonus: { defensa: 20, durabilidad: 60 }
    },
    botas_hierro: {
        id: 'botas_hierro', nombre: '👢 Botas de Hierro', emoji: '👢', tipo: 'armadura',
        requiere: { hierro: 8, cuero: 8 }, valor: 100, exp: 15, nivel: 3,
        bonus: { defensa: 8, durabilidad: 35 }
    },
    // Consumibles
    poción_vida: {
        id: 'poción_vida', nombre: '🧪 Poción de Vida', emoji: '🧪', tipo: 'consumible',
        requiere: { cristal: 3, fibra: 10, perla: 1 }, valor: 80, exp: 12, nivel: 4,
        efecto: { cura: 50, usos: 1 }
    },
    poción_fuerza: {
        id: 'poción_fuerza', nombre: '💪 Poción de Fuerza', emoji: '💪', tipo: 'consumible',
        requiere: { cristal: 5, ambiente: 2, oro: 2 }, valor: 150, exp: 25, nivel: 8,
        efecto: { daño_bonus: 20, duracion: 300, usos: 1 } // 5 minutos
    },
    cebo_magico: {
        id: 'cebo_magico', nombre: '🪱 Cebo Mágico', emoji: '🪱', tipo: 'consumible',
        requiere: { perla: 2, resina: 1, fibra: 15 }, valor: 120, exp: 18, nivel: 6,
        efecto: { pesca_luck: 2.0, duracion: 600, usos: 3 } // 10 minutos, 3 usos
    },
    // Especiales
    anillo_oro: {
        id: 'anillo_oro', nombre: '💍 Anillo de Oro', emoji: '💍', tipo: 'accesorio',
        requiere: { oro: 5, rubi: 1 }, valor: 800, exp: 50, nivel: 10,
        bonus: { luck: 1.3, charisma: 10 }
    },
    amuleto_esmeralda: {
        id: 'amuleto_esmeralda', nombre: '📿 Amuleto Esmeralda', emoji: '📿', tipo: 'accesorio',
        requiere: { esmeralda: 3, oro: 3, cristal: 5 }, valor: 1500, exp: 80, nivel: 15,
        bonus: { exp_bonus: 1.5, luck: 1.2, mineria: 1.2 }
    },
    corona_diamante: {
        id: 'corona_diamante', nombre: '👑 Corona de Diamante', emoji: '👑', tipo: 'accesorio',
        requiere: { diamante: 10, oro: 20, esmeralda: 5, titanio: 2 }, valor: 10000, exp: 300, nivel: 30,
        bonus: { luck: 2.0, exp_bonus: 2.0, charisma: 50, mineria: 1.5, pesca: 1.5, caza: 1.5 }
    },
}

// ── Items de tienda (compra/venta) ─────────────────────────────
export const TIENDA_ITEMS = {
    pico_madera: { ...RECETAS_CRAFTEO.pico_madera, precio_compra: 75, precio_venta: 25 },
    pico_hierro: { ...RECETAS_CRAFTEO.pico_hierro, precio_compra: 250, precio_venta: 75 },
    pico_oro: { ...RECETAS_CRAFTEO.pico_oro, precio_compra: 800, precio_venta: 250 },
    caña_basica: { ...RECETAS_CRAFTEO.caña_basica, precio_compra: 60, precio_venta: 20 },
    caña_oro: { ...RECETAS_CRAFTEO.caña_oro, precio_compra: 500, precio_venta: 150 },
    arco_madera: { ...RECETAS_CRAFTEO.arco_madera, precio_compra: 120, precio_venta: 40 },
    arco_hierro: { ...RECETAS_CRAFTEO.arco_hierro, precio_compra: 350, precio_venta: 100 },
    espada_hierro: { ...RECETAS_CRAFTEO.espada_hierro, precio_compra: 300, precio_venta: 90 },
    poción_vida: { ...RECETAS_CRAFTEO.poción_vida, precio_compra: 120, precio_venta: 40 },
    poción_fuerza: { ...RECETAS_CRAFTEO.poción_fuerza, precio_compra: 250, precio_venta: 75 },
    cebo_magico: { ...RECETAS_CRAFTEO.cebo_magico, precio_compra: 200, precio_venta: 60 },
}

// ── Rareza colores y multiplicadores ───────────────────────────
export const RAREZA_INFO = {
    comun:       { color: '#AAAAAA', nombre: 'Común',       multiplicador: 1.0 },
    poco_comun:  { color: '#55FF55', nombre: 'Poco Común',  multiplicador: 1.2 },
    raro:        { color: '#5555FF', nombre: 'Raro',        multiplicador: 1.5 },
    epico:       { color: '#AA00AA', nombre: 'Épico',       multiplicador: 2.0 },
    legendario:  { color: '#FFAA00', nombre: 'Legendario',  multiplicador: 3.0 },
    mitico:      { color: '#FF5555', nombre: 'Mítico',      multiplicador: 5.0 },
}

// ── Helper: Obtener item por ID ────────────────────────────────
export function getItem(id) {
    return MINERALES[id] || PECES[id] || ANIMALES[id] || MATERIALES[id] || RECETAS_CRAFTEO[id] || TIENDA_ITEMS[id] || null
}

// ── Helper: Lista de items por categoría ───────────────────────
export function getItemsByCategory(categoria) {
    switch(categoria) {
        case 'mineral': return Object.values(MINERALES)
        case 'pez': return Object.values(PECES)
        case 'animal': return Object.values(ANIMALES)
        case 'material': return Object.values(MATERIALES)
        case 'crafteo': return Object.values(RECETAS_CRAFTEO)
        case 'tienda': return Object.values(TIENDA_ITEMS)
        default: return []
    }
}

// ── Helper: Seleccionar item aleatorio según probabilidad ────
export function rollItem(itemsPool, luckBonus = 1) {
    const pool = Object.values(itemsPool)
    const totalWeight = pool.reduce((sum, item) => sum + item.probabilidad, 0)
    let roll = Math.random() * totalWeight / luckBonus

    for (const item of pool) {
        roll -= item.probabilidad
        if (roll <= 0) return item
    }
    return pool[0]
}

// ── Helper: Formatear rareza ───────────────────────────────────
export function formatRareza(rareza) {
    const info = RAREZA_INFO[rareza] || RAREZA_INFO.comun
    return info.nombre
}
