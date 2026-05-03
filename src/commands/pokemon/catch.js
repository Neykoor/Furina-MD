/**
 * Comando: .catch [ball]
 * Captura un Pokémon salvaje activo
 */

import { getActiveBattle } from './wild.js'
import { Pokemon } from './lib/pokemon.js'
import { initUser, getTypeEmoji, formatNumber } from './lib/utils.js'
import { useItem, ITEMS } from './lib/items.js'
import { calculateCatchXp } from './lib/catchMath.js'

const BALL_IDS = ['pokeball', 'greatball', 'ultraball', 'masterball']

let handler = async (m, { conn, usedPrefix, args }) => {
    if (!m.isGroup) return m.reply('❌ Solo en grupos')

    // Obtener batalla activa del usuario
    const battle = getActiveBattle(m.sender)
    if (!battle) {
        return m.reply(`❌ No tienes un Pokémon salvaje activo. Usa *${usedPrefix}wild* primero`)
    }

    const user = initUser(m.sender, m.pushName)
    const inventory = user.pokemonV1.inventory || {}
    const team = user.pokemonV1.team
    const box = user.pokemonV1.box
    const teamFull = team.length >= 6
    const boxFull = box.length >= 50

    if (teamFull && boxFull) {
        return m.reply(`❌ Almacenamiento lleno. Libera Pokémon con *${usedPrefix}release*`)
    }

    // Determinar qué ball usar
    const availableBalls = BALL_IDS.filter(ballId => inventory[ballId] > 0)
    if (availableBalls.length === 0) {
        return m.reply(`❌ No tienes Poké Balls. Consíguelas con *${usedPrefix}rebuscar*`)
    }

    let ballToUse = args[0]?.toLowerCase()
    let selectedBall = null

    if (ballToUse) {
        if (!BALL_IDS.includes(ballToUse)) {
            return m.reply(`❌ Ball no válida. Usa: ${BALL_IDS.join(', ')}`)
        }
        if (!inventory[ballToUse] || inventory[ballToUse] < 1) {
            return m.reply(`❌ No tienes ${ITEMS[ballToUse].name}. Tienes: ${availableBalls.map(id => `${ITEMS[id].name} (${inventory[id]})`).join(', ')}`)
        }
        selectedBall = ballToUse
    } else {
        // Seleccionar la ball más abundante
        selectedBall = availableBalls.reduce((a, b) => (inventory[a] > inventory[b] ? a : b))
    }

    const ballName = ITEMS[selectedBall].name

    // Intentar capturar usando la instancia de batalla
    // Nota: attemptCatch requiere un callback para consumir el item
    const result = battle.attemptCatch(selectedBall, inventory, (item, qty) => useItem(user, item, qty))

    if (result.error) return m.reply(`❌ ${result.error}`)

    if (!result.success) {
        let text = `😓 *¡La captura falló!*\nEl ${battle.wild.displayName} se liberó de la ${ballName}.\n`
        if (result.fled) {
            text += `🏃 *¡El Pokémon huyó!*\n`
            // La batalla ya se eliminó dentro de attemptCatch
        } else if (result.wildDamage > 0) {
            text += `\n🌿 ${battle.wild.displayName} contraataca!\n💥 Daño: ${result.wildDamage}\n❤️ Tu ${battle.player.displayName}: ${result.playerHp}/${battle.player.stats.maxHp} HP\n`
            if (result.playerFainted) {
                text += `\n💀 *¡Tu Pokémon se debilitó!* ${battle.wild.displayName} huyó.`
            } else {
                text += `\n🔄 Puedes intentar de nuevo con *${usedPrefix}catch* o atacar con *${usedPrefix}wattack*.`
            }
        } else {
            text += `\n🔄 Sigue ahí. Puedes intentar de nuevo.`
        }
        text += `\n📦 Te quedan ${inventory[selectedBall] || 0} ${ballName}(s).`
        return m.reply(text)
    }

    // --- Captura exitosa ---
    const wild = battle.wild
    wild.caughtBy = m.sender
    wild.caughtAt = Date.now()

    const xpGained = result.xpGained
    const xpResult = wild.gainXp(xpGained)

    let location = ''
    if (team.length < 6) {
        team.push(wild.toJSON())
        location = `⚔️ Equipo (${team.length}/6)`
    } else {
        box.push(wild.toJSON())
        location = `📦 Caja (${box.length}/50)`
    }

    user.pokemonV1.caught++
    user.pokemonV1.totalXpGained += xpGained

    // La batalla ya se marcó como 'caught' dentro de attemptCatch, y se eliminará después

    const shinyBonus = wild.shiny ? '\n🌟 ¡Felicidades! Es un Pokémon shiny raro!' : ''
    const typeEmojis = wild.types.map(t => getTypeEmoji(t)).join(' ')

    let text = `🎉 *¡Captura exitosa!*${shinyBonus}\n\n`
    text += `Has usado: ${ballName}\n`
    text += `${wild.shiny ? '✨ ' : ''}*${wild.displayName}* ha sido atrapado\n`
    text += `📊 Nivel: ${wild.level}\n`
    text += `🔸 Tipo: ${typeEmojis} ${wild.types.join('/')}\n`
    text += `❤️ HP: ${wild.stats.maxHp}\n`
    text += `📍 Ubicación: ${location}\n\n`
    text += `💡 *Experiencia ganada:* +${formatNumber(xpGained)} XP\n`

    if (xpResult.leveledUp) {
        text += `⬆️ *¡Subió de nivel!* Ahora es nivel ${xpResult.newLevel}\n`
        if (xpResult.levelsGained > 1) {
            text += `   (¡Subió ${xpResult.levelsGained} niveles de golpe!)\n`
        }
    }

    text += `\n📦 Te quedan ${inventory[selectedBall] || 0} ${ballName}(s)\n`
    text += `Usa *${usedPrefix}team* para ver tu equipo o *${usedPrefix}pokemon 1* para detalles`

    await conn.sendMessage(m.chat, { text, mentions: [m.sender] })
}

handler.help = ['catch']
handler.tags = ['pokemon']
handler.command = ['catch', 'capturar']
handler.group = true

export default handler