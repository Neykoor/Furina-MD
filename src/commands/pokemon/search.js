/**
 * Comando: .rebuscar / .search
 * Busca items con sistema de rareza, rachas, eventos especiales y límite diario.
 * Cooldown: 45 segundos.
 */

import { initUser, isInAnyBattle, formatNumber } from './lib/utils.js'
import { addItem, ITEMS } from './lib/items.js'
import { Pokemon } from './lib/pokemon.js'
import { getRandomPokemon } from './lib/data.js'

// Constantes
const SEARCH_COOLDOWN = 45 * 1000 // 45 segundos
const MAX_DAILY_SEARCH = 30       // Máximo de búsquedas por día
const EVENT_CHANCE = 0.08         // 8% de probabilidad de evento especial (Pokémon salvaje)

// Items con sus probabilidades (basado en rareza)
const ITEM_POOL = [
    { id: 'pokeball', min: 1, max: 3, weight: 40 },   // 40%
    { id: 'potion', min: 1, max: 2, weight: 30 },      // 30%
    { id: 'greatball', min: 1, max: 2, weight: 15 },   // 15%
    { id: 'superpotion', min: 1, max: 1, weight: 8 },  // 8%
    { id: 'ultraball', min: 1, max: 1, weight: 4 },    // 4%
    { id: 'revive', min: 1, max: 1, weight: 2 },       // 2%
    { id: 'rare_candy', min: 1, max: 1, weight: 1 }    // 1%
]

// Mensajes de éxito variados
const SUCCESS_MESSAGES = [
    "🎉 ¡Encontraste {item}!", "✨ ¡Rebuscando hallaste {item}!", "🍀 ¡Qué suerte! Obtuviste {item}.",
    "📦 ¡Descubriste {item} entre la hierba!", "💎 ¡Un {item} brillante!", "🎁 ¡Sorpresa! Encontraste {item}."
]

// Mensajes de fallo
const FAIL_MESSAGES = [
    "🔍 No encuentras nada útil...", "🍂 Rebuscas entre los arbustos pero no hay nada.",
    "🌿 El lugar parece vacío.", "😔 Nada interesante por aquí.",
    "💨 El viento se lleva tus esperanzas...", "🕳️ Solo encuentras tierra y piedras."
]

// Calcular probabilidades acumuladas
function buildWeightedTable() {
    let total = 0
    for (const item of ITEM_POOL) total += item.weight
    const table = []
    let accumulated = 0
    for (const item of ITEM_POOL) {
        accumulated += item.weight
        table.push({
            id: item.id,
            min: item.min,
            max: item.max,
            threshold: accumulated / total
        })
    }
    return table
}

const WEIGHTED_TABLE = buildWeightedTable()

// Seleccionar item basado en probabilidad
function getRandomItem() {
    const rand = Math.random()
    for (const item of WEIGHTED_TABLE) {
        if (rand <= item.threshold) {
            const amount = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min
            return { id: item.id, amount }
        }
    }
    return { id: 'pokeball', amount: 1 } // fallback
}

// Mejora por racha (aumenta la calidad del item)
function applyStreakBonus(itemId, streak) {
    // La racha mejora el item: pokeball -> greatball, greatball -> ultraball, etc.
    const upgradeMap = {
        pokeball: 'greatball',
        greatball: 'ultraball',
        potion: 'superpotion'
    }
    if (streak >= 3 && upgradeMap[itemId]) {
        return upgradeMap[itemId]
    }
    if (streak >= 7 && itemId === 'superpotion') {
        return 'revive'
    }
    if (streak >= 10 && itemId === 'ultraball') {
        return 'rare_candy'
    }
    return itemId
}

let handler = async (m, { conn, usedPrefix }) => {
    // No se puede buscar en batalla
    if (isInAnyBattle(m.sender)) {
        return m.reply(`❌ No puedes rebuscar mientras estás en batalla.`)
    }

    const user = initUser(m.sender, m.pushName)
    const now = Date.now()

    // Inicializar datos de búsqueda si no existen
    if (!user.pokemonV1.search) {
        user.pokemonV1.search = {
            streak: 0,
            lastSearch: 0,
            dailyCount: 0,
            lastDailyReset: null
        }
    }
    const search = user.pokemonV1.search

    // Reiniciar contador diario si es nuevo día
    const today = new Date().toDateString()
    if (search.lastDailyReset !== today) {
        search.dailyCount = 0
        search.lastDailyReset = today
    }

    // Verificar límite diario
    if (search.dailyCount >= MAX_DAILY_SEARCH) {
        return m.reply(`⏰ Límite diario de búsquedas alcanzado (${MAX_DAILY_SEARCH}). Vuelve mañana.`)
    }

    // Verificar cooldown
    const lastSearch = search.lastSearch || 0
    if (now - lastSearch < SEARCH_COOLDOWN) {
        const remaining = SEARCH_COOLDOWN - (now - lastSearch)
        const seconds = Math.ceil(remaining / 1000)
        return m.reply(`⏳ Debes esperar ${seconds}s para rebuscar de nuevo.`)
    }

    // Actualizar cooldown y contador diario
    search.lastSearch = now
    search.dailyCount++

    // Evento especial: Pokémon salvaje
    if (Math.random() < EVENT_CHANCE) {
        try {
            const wildPokemon = await Pokemon.createWild(getRandomPokemon())
            // Forzar nivel bajo (1-3) para que sea fácil
            wildPokemon.level = Math.floor(Math.random() * 3) + 1
            wildPokemon.currentHp = wildPokemon.stats.maxHp
            const shinyText = wildPokemon.shiny ? '✨ ' : ''
            const msg = `⚠️ *¡Cuidado!* Un ${shinyText}${wildPokemon.displayName} salvaje (Nv.${wildPokemon.level}) apareció mientras rebuscabas.\n\nUsa *${usedPrefix}wattack* para combatirlo o *${usedPrefix}wrun* para huir.`
            // Aquí deberíamos iniciar un encuentro salvaje. Para simplificar, lo simulamos.
            // En realidad, habría que integrarlo con el sistema wild.js. Por ahora, solo avisamos.
            await conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] })
            // Podrías llamar a una función para crear el encuentro, pero eso requiere modificar wild.js
            // Por ahora, no decrementamos el contador diario ni el cooldown? Mejor sí, para que no se abusar.
            // Se mantiene el cooldown y se cuenta como búsqueda.
            search.streak = 0 // La racha se rompe por el evento
            const remainingDaily = MAX_DAILY_SEARCH - search.dailyCount
            return m.reply(`⚠️ Has interrumpido tu búsqueda por el encuentro. Rachas reiniciadas.\n📅 Te quedan ${remainingDaily} búsquedas hoy.`)
        } catch (err) {
            console.error('Error generando evento Pokémon:', err)
        }
    }

    // Obtener item base según probabilidad
    let { id: itemId, amount } = getRandomItem()

    // Aplicar mejora por racha
    const originalItem = itemId
    itemId = applyStreakBonus(itemId, search.streak)

    // Si el item cambió por racha, ajustamos cantidad y mensaje
    let upgraded = (originalItem !== itemId)
    if (upgraded) {
        amount = Math.max(1, Math.floor(amount * 1.5))
    }

    // Añadir item al inventario
    addItem(user, itemId, amount)
    const item = ITEMS[itemId]
    const newQty = user.pokemonV1.inventory[itemId] || 0

    // Incrementar racha
    search.streak++

    // Mensaje de éxito
    const msgTemplate = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]
    let msg = msgTemplate.replace('{item}', `${amount} ${item.name}${amount > 1 ? 's' : ''}`)
    if (upgraded) {
        msg += ` ✨ *¡Mejora por racha!* ✨`
    }
    if (search.streak > 1) {
        msg += `\n🔥 *Racha: ${search.streak} búsquedas exitosas consecutivas*`
    }
    msg += `\n📦 Ahora tienes *${newQty}* ${item.name}(s).`
    msg += `\n📅 Búsquedas restantes hoy: ${MAX_DAILY_SEARCH - search.dailyCount}`

    await conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] })
}

handler.help = ['search', 'rebuscar']
handler.tags = ['pokemon-v1']
handler.command = ['search', 'rebuscar', 'find']
handler.group = true

export default handler