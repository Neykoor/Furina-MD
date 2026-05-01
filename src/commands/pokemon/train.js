/**
 * Comando: .train - Entrenamiento Pokémon mejorado
 * - Cooldown por Pokémon (20 min)
 * - XP variable por nivel (más XP para niveles bajos)
 * - Eventos críticos (doble XP)
 * - Penalización por HP bajo
 * - Límite diario (10 entrenamientos por día)
 * - Muestra entrenamientos restantes para subir de nivel
 */

import { Pokemon } from './lib/pokemon.js'
import { initUser, formatNumber, isInAnyBattle } from './lib/utils.js'

const TRAIN_COOLDOWN = 20 * 60 * 1000 // 20 minutos por Pokémon
const MAX_DAILY_TRAIN = 10            // Máximo de entrenamientos por día (global)

// Calcula XP base según nivel
function calculateTrainXp(pokemon) {
    let base = 20
    if (pokemon.level < 20) base = 30
    else if (pokemon.level < 40) base = 25
    else if (pokemon.level < 70) base = 20
    else base = 15
    if (pokemon.shiny) base = Math.floor(base * 1.5)
    return base
}

// Penalización por HP bajo
function getHpPenalty(pokemon) {
    const percent = pokemon.currentHp / pokemon.stats.maxHp
    if (percent < 0.3) return 0.5
    if (percent < 0.6) return 0.75
    return 1.0
}

// Formatea el tiempo restante de cooldown
function formatCooldown(remaining) {
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.ceil((remaining % 60000) / 1000)
    return `${minutes}m ${seconds}s`
}

let handler = async (m, { conn, usedPrefix, args }) => {
    // Bloquear si está en batalla
    if (isInAnyBattle(m.sender)) {
        return m.reply(`❌ No puedes entrenar mientras estás en batalla.`)
    }

    const user = initUser(m.sender, m.pushName)
    const team = user.pokemonV1.team
    if (!team.length) {
        return m.reply(`❌ No tienes Pokémon. Usa *${usedPrefix}wild* para empezar.`)
    }

    // Control diario de entrenamientos
    const today = new Date().toDateString()
    if (!user.pokemonV1.trainDaily || user.pokemonV1.trainDaily !== today) {
        user.pokemonV1.trainDaily = today
        user.pokemonV1.trainCount = 0
    }
    const remainingDaily = MAX_DAILY_TRAIN - (user.pokemonV1.trainCount || 0)

    // ========== MODO ALL ==========
    if (args[0]?.toLowerCase() === 'all') {
        if (remainingDaily <= 0) {
            return m.reply(`❌ Límite diario alcanzado (${MAX_DAILY_TRAIN} entrenamientos). Vuelve mañana.`)
        }

        const now = Date.now()
        let trained = 0
        let totalXp = 0
        let results = []
        let dailyUsed = 0

        for (let i = 0; i < team.length; i++) {
            if (dailyUsed >= remainingDaily) break // respetar límite diario

            const pokemon = Pokemon.fromJSON(team[i])
            if (pokemon.level >= 100) {
                results.push(`⏭️ ${pokemon.displayName} (nivel máximo)`)
                continue
            }

            const lastTrain = pokemon.lastTrainTime || 0
            if (now - lastTrain < TRAIN_COOLDOWN) {
                const remaining = TRAIN_COOLDOWN - (now - lastTrain)
                results.push(`⏳ ${pokemon.displayName} (cooldown: ${formatCooldown(remaining)})`)
                continue
            }

            // Calcular XP con todas las variables
            let xpGain = calculateTrainXp(pokemon)
            const penalty = getHpPenalty(pokemon)
            if (penalty < 1) xpGain = Math.floor(xpGain * penalty)
            const isCritical = Math.random() < 0.1
            if (isCritical) xpGain *= 2

            const xpResult = pokemon.gainXp(xpGain)
            pokemon.lastTrainTime = now
            team[i] = pokemon.toJSON()
            user.pokemonV1.trained++
            user.pokemonV1.totalXpGained += xpGain
            totalXp += xpGain
            trained++
            dailyUsed++

            let line = `${pokemon.shiny ? '✨ ' : ''}${pokemon.displayName}: +${xpGain} XP`
            if (isCritical) line += ` ✨ CRÍTICO ✨`
            if (penalty < 1) line += ` (HP bajo -${Math.floor(penalty * 100)}%)`
            if (xpResult.leveledUp) line += ` ⬆️ subió a nivel ${xpResult.newLevel}`
            results.push(line)
        }

        if (trained === 0) {
            return m.reply(`❌ No se pudo entrenar a ningún Pokémon.\n\n${results.slice(0, 5).join('\n')}`)
        }

        user.pokemonV1.trainCount = (user.pokemonV1.trainCount || 0) + trained
        const newRemaining = MAX_DAILY_TRAIN - user.pokemonV1.trainCount

        let text = `🏋️ *ENTRENAMIENTO GRUPAL*\n`
        text += `Entrenados: ${trained} | XP total: +${totalXp}\n`
        text += `📅 Entrenamientos restantes hoy: ${newRemaining}/${MAX_DAILY_TRAIN}\n\n`
        text += results.join('\n')
        text += `\n\n⏳ Cooldown por Pokémon: 20 min individual.`
        return m.reply(text)
    }

    // ========== ENTRENAR UN SOLO POKÉMON ==========
    const index = parseInt(args[0]) - 1
    if (isNaN(index)) {
        // Mostrar lista de Pokémon con estado
        let list = `🏋️ *ENTRENAR POKÉMON*\n${'═'.repeat(30)}\n`
        const now = Date.now()
        team.forEach((p, i) => {
            const poke = Pokemon.fromJSON(p)
            const canTrain = poke.level < 100 && (now - (poke.lastTrainTime || 0) >= TRAIN_COOLDOWN)
            const cooldownText = !canTrain && poke.level < 100 ? `⏳ ${formatCooldown(TRAIN_COOLDOWN - (now - (poke.lastTrainTime || 0)))}` : ''
            list += `${i + 1}. ${poke.shiny ? '✨ ' : ''}${poke.displayName} (Nv.${poke.level}) ${canTrain ? '✅' : '❌'} ${cooldownText}\n`
        })
        list += `\n${'═'.repeat(30)}\n`
        list += `📅 Entrenamientos restantes hoy: ${remainingDaily}/${MAX_DAILY_TRAIN}\n`
        list += `💡 *${usedPrefix}train [número]* para entrenar uno\n`
        list += `💡 *${usedPrefix}train all* para entrenar a todos (respetando cooldown)`
        return m.reply(list)
    }

    if (index < 0 || index >= team.length) {
        return m.reply(`❌ Número inválido. Tienes ${team.length} Pokémon.`)
    }

    if (remainingDaily <= 0) {
        return m.reply(`❌ Límite diario alcanzado (${MAX_DAILY_TRAIN} entrenamientos). Vuelve mañana.`)
    }

    const pokemon = Pokemon.fromJSON(team[index])
    if (pokemon.level >= 100) {
        return m.reply(`❌ ${pokemon.displayName} ya es nivel máximo.`)
    }

    const now = Date.now()
    const lastTrain = pokemon.lastTrainTime || 0
    if (now - lastTrain < TRAIN_COOLDOWN) {
        const remaining = TRAIN_COOLDOWN - (now - lastTrain)
        return m.reply(`⏳ ${pokemon.displayName} ya entrenó hace poco. Espera ${formatCooldown(remaining)}.`)
    }

    // Calcular XP con todas las variables
    let xpGain = calculateTrainXp(pokemon)
    const penalty = getHpPenalty(pokemon)
    if (penalty < 1) xpGain = Math.floor(xpGain * penalty)
    const isCritical = Math.random() < 0.1
    if (isCritical) xpGain *= 2

    // Guardar XP antes para mostrar cuántos entrenamientos faltaban
    const xpNeededBefore = pokemon.xpToNext
    const trainsNeededBefore = xpNeededBefore ? Math.ceil(xpNeededBefore / xpGain) : 0

    const xpResult = pokemon.gainXp(xpGain)
    pokemon.lastTrainTime = now
    team[index] = pokemon.toJSON()
    user.pokemonV1.trained++
    user.pokemonV1.totalXpGained += xpGain
    user.pokemonV1.trainCount = (user.pokemonV1.trainCount || 0) + 1

    // Construir mensaje
    let text = `🏋️ *ENTRENAMIENTO*\n${'═'.repeat(30)}\n`
    text += `${pokemon.shiny ? '✨ ' : ''}*${pokemon.displayName}* (Nv.${pokemon.level})\n`
    text += `💪 +${xpGain} XP`
    if (isCritical) text += ` ✨ CRÍTICO ✨`
    if (penalty < 1) text += `\n⚠️ Penalización por HP bajo: -${Math.floor((1 - penalty) * 100)}% XP`
    text += `\n📊 ${pokemon.getXpBar()}\n`

    if (xpResult.leveledUp) {
        text += `\n⬆️ *¡Subió al nivel ${xpResult.newLevel}!*\n`
        text += `❤️ HP: ${pokemon.stats.maxHp} | ⚔️ ATK: ${pokemon.stats.attack} | 🛡️ DEF: ${pokemon.stats.defense} | 💨 SPD: ${pokemon.stats.speed}\n`
    } else if (trainsNeededBefore > 0) {
        const xpNeededAfter = pokemon.xpToNext
        const trainsNeededAfter = Math.ceil(xpNeededAfter / calculateTrainXp(pokemon))
        text += `\n📈 Faltan ~${trainsNeededAfter} entrenamientos para el nivel ${pokemon.level + 1}`
    }

    text += `\n${'═'.repeat(30)}\n`
    text += `⏳ Próximo entrenamiento de ${pokemon.displayName}: ${formatCooldown(TRAIN_COOLDOWN)}\n`
    text += `📅 Entrenamientos restantes hoy: ${remainingDaily - 1}/${MAX_DAILY_TRAIN}`

    await conn.sendMessage(m.chat, { text, mentions: [m.sender] })
}

handler.help = ['train']
handler.tags = ['pokemon-v1']
handler.command = ['train', 'entrenar']
handler.group = true

export default handler