/**
 * Comando: .wild - Buscar Pokémon salvaje según la ruta actual del entrenador
 * Versión con sistema de rutas y exportación de getActiveBattle.
 */

import { Pokemon } from './lib/pokemon.js'
import { getRandomPokemonByRoute, getRouteLevelRange, getRouteInfo } from './lib/routes.js'
import { getTypeEmoji, initUser, initChat, generateEncounterId, formatNumber, registerWildBattle, unregisterWildBattle, isInPvpBattle, checkCooldown, setCooldown } from './lib/utils.js'
import { ITEMS, useItem } from './lib/items.js'
import { WildBattle } from './lib/wildBattle.js'
import { calculateCatchXp } from './lib/catchMath.js'

// Constantes
const WILD_COOLDOWN = 2 * 60 * 1000
const ENCOUNTER_TIMEOUT = 5 * 60 * 1000
const MAX_BOX = 50

// Almacenamiento local de instancias de WildBattle
const activeWildBattles = new Map() // encounterId -> WildBattle

// Helper para obtener batalla activa por userId (exportada)
export function getActiveBattle(userId) {
    for (const battle of activeWildBattles.values()) {
        if (battle.userId === userId && battle.status !== 'fled' && battle.status !== 'caught') {
            return battle
        }
    }
    return null
}

function cleanupWildBattle(encounterId, userId) {
    activeWildBattles.delete(encounterId)
    unregisterWildBattle(userId)
}

function formatWildEncounter(pokemon, teamLength, boxLength, usedPrefix, routeName) {
    const shinyText = pokemon.shiny ? '✨ ' : ''
    const typeEmojis = pokemon.types.map(t => getTypeEmoji(t)).join(' ')
    const storageMsg = teamLength >= 6 ? `📦 Irá a la caja (${boxLength}/${MAX_BOX})` : `⚔️ Irá al equipo (${teamLength}/6)`
    return `🌿 *¡Un ${shinyText}${pokemon.displayName} salvaje apareció en ${routeName}!*\n\n` +
        `📊 Nivel: ${pokemon.level}\n` +
        `🔸 Tipo: ${typeEmojis} ${pokemon.types.join('/')}\n` +
        `❤️ HP: ${pokemon.getHpBar()}\n` +
        `${storageMsg}\n\n` +
        `⚡ *Opciones:*\n` +
        `• *${usedPrefix}wattack* - Atacar\n` +
        `• *${usedPrefix}wcatch* - Capturar\n` +
        `• *${usedPrefix}wuse [item]* - Usar item\n` +
        `• *${usedPrefix}wswitch* - Cambiar Pokémon\n` +
        `• *${usedPrefix}wrun* - Huir`
}

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!m.isGroup) return m.reply('❌ Solo en grupos')
    const chat = initChat(m.chat)
    if (!chat.pokemonV1Enabled) {
        return m.reply(`❌ Sistema no activado. Usa *${usedPrefix}startpokemon*`)
    }

    if (isInPvpBattle(m.sender)) {
        return m.reply(`❌ No puedes buscar Pokémon salvaje mientras estás en una batalla PvP.`)
    }

    const user = initUser(m.sender, m.pushName)
    const team = user.pokemonV1.team
    const box = user.pokemonV1.box
    const currentRoute = user.pokemonV1.currentRoute || 1
    const routeInfo = getRouteInfo(currentRoute)
    const now = Date.now()

    let battle = getActiveBattle(m.sender)

    // ---- COMANDO: wild ----
    if (['wild', 'buscar'].includes(command)) {
        if (team.length === 0) {
            return m.reply(`❌ No tienes Pokémon. Usa *${usedPrefix}oak* para obtener tu inicial.`)
        }
        if (team.length >= 6 && box.length >= MAX_BOX) {
            return m.reply(`❌ Almacenamiento lleno. Libera con *${usedPrefix}release*`)
        }
        if (battle) {
            return m.reply(`❌ Ya tienes un encuentro activo. Usa *${usedPrefix}wattack* o *${usedPrefix}wrun*`)
        }

        const cdRemaining = checkCooldown(m.sender, 'wildV1', WILD_COOLDOWN)
        if (cdRemaining > 0) {
            const seconds = Math.ceil(cdRemaining / 1000)
            return m.reply(`⏳ Espera ${seconds}s para buscar otro Pokémon.`)
        }

        try {
            // Obtener Pokémon según la ruta
            const pokemonId = getRandomPokemonByRoute(currentRoute)
            const levelRange = getRouteLevelRange(currentRoute)
            const level = Math.floor(Math.random() * (levelRange.max - levelRange.min + 1)) + levelRange.min
            const wildPokemon = await Pokemon.createWild(pokemonId, level)
            const playerPokemon = Pokemon.fromJSON(team[0])
            if (playerPokemon.currentHp <= 0) {
                return m.reply(`❌ Tu primer Pokémon (${playerPokemon.displayName}) está debilitado. Cúralo en el Centro Pokémon.`)
            }

            const encounterId = generateEncounterId()
            battle = new WildBattle(encounterId, m.sender, wildPokemon, playerPokemon)
            activeWildBattles.set(encounterId, battle)
            registerWildBattle(m.sender, encounterId)

            setCooldown(m.sender, 'wildV1', WILD_COOLDOWN)

            setTimeout(() => {
                const b = activeWildBattles.get(encounterId)
                if (b && b.status !== 'caught' && b.status !== 'fled') {
                    cleanupWildBattle(encounterId, m.sender)
                }
            }, ENCOUNTER_TIMEOUT)

            const caption = formatWildEncounter(wildPokemon, team.length, box.length, usedPrefix, routeInfo.name)
            await conn.sendMessage(m.chat, {
                image: { url: wildPokemon.artwork || wildPokemon.sprite },
                caption,
                mentions: [m.sender]
            })
        } catch (err) {
            console.error(err)
            return m.reply('❌ Error al generar el Pokémon salvaje.')
        }
        return
    }

    if (!battle) {
        return m.reply(`❌ No tienes un encuentro activo. Usa *${usedPrefix}wild* para buscar.`)
    }

    if (battle.isExpired()) {
        cleanupWildBattle(battle.id, m.sender)
        return m.reply(`⏰ El encuentro ha expirado. Usa *${usedPrefix}wild* para buscar otro.`)
    }

    // ---- wattack ----
    if (['wattack', 'watacar', 'wildattack'].includes(command)) {
        let result
        if (battle.status === 'active') {
            const startResult = battle.startBattle()
            if (startResult.firstStrike === 'wild') {
                team[0] = battle.player.toJSON()
                user.pokemonV1.team = team
                const msg = `⚔️ *¡COMIENZA LA BATALLA!*\n\n` +
                    `🌿 *${battle.wild.displayName}* ataca primero!\n` +
                    `💥 Daño: ${startResult.damage}\n` +
                    `❤️ Tu ${battle.player.displayName}: ${startResult.playerHp}/${startResult.playerMaxHp}\n\n` +
                    `🔄 Es tu turno. Usa *${usedPrefix}wattack*, *${usedPrefix}wuse*, *${usedPrefix}wswitch*, *${usedPrefix}wcatch* o *${usedPrefix}wrun*.`
                return conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] })
            } else {
                result = battle.playerAttack()
            }
        } else {
            result = battle.playerAttack()
        }

        if (result.error) return m.reply(`❌ ${result.error}`)

        team[0] = battle.player.toJSON()
        user.pokemonV1.team = team

        let text = `⚔️ *Tu ${battle.player.displayName} ataca!*\n💥 Daño: ${result.playerDamage}`
        if (result.effectiveness) {
            const effMsg = result.effectiveness > 1 ? '¡Es muy efectivo!' : (result.effectiveness < 1 ? 'No es muy efectivo...' : '')
            if (effMsg) text += ` (${effMsg})`
        }
        text += `\n\n🌿 *${battle.wild.displayName}:* ${result.wildHp}/${result.wildMaxHp} HP\n`

        if (result.wildFainted) {
            cleanupWildBattle(battle.id, m.sender)
            text += `\n💀 *¡${battle.wild.displayName} se debilitó!* Ha huido.`
            return m.reply(text)
        }

        if (result.wildDamage !== undefined) {
            text += `\n🌿 *${battle.wild.displayName} contraataca!*\n💥 Daño: ${result.wildDamage}\n` +
                `❤️ Tu ${battle.player.displayName}: ${result.playerHp}/${result.playerMaxHp} HP\n`
            if (result.playerFainted) {
                cleanupWildBattle(battle.id, m.sender)
                text += `\n💀 *¡Tu Pokémon se debilitó!* ${battle.wild.displayName} huyó.`
                return m.reply(text)
            }
        }

        text += `\n🔄 Es tu turno. Usa *${usedPrefix}wattack*, *${usedPrefix}wuse*, *${usedPrefix}wswitch*, *${usedPrefix}wcatch* o *${usedPrefix}wrun*.`
        return m.reply(text)
    }

    // ---- wuse ----
    if (['wuse', 'wusar', 'wilduse'].includes(command)) {
        if (battle.status !== 'battling') {
            return m.reply(`❌ Inicia la batalla primero con *${usedPrefix}wattack*`)
        }
        const itemId = args[0]?.toLowerCase()
        if (!itemId || !ITEMS[itemId] || ITEMS[itemId].type === 'ball') {
            return m.reply(`❌ Item inválido. Usa: potion (más items próximamente)`)
        }
        if (!(user.pokemonV1.inventory?.[itemId] > 0)) {
            return m.reply(`❌ No tienes ${ITEMS[itemId].name}`)
        }

        const result = battle.useItem(itemId)
        if (result.error) return m.reply(`❌ ${result.error}`)

        useItem(user, itemId, 1)
        team[0] = battle.player.toJSON()
        user.pokemonV1.team = team

        let text = `🎒 *Usaste ${ITEMS[itemId].name}!*\n${result.effectMessage}\n\n`
        text += `🌿 *${battle.wild.displayName} ataca!*\n💥 Daño: ${result.wildDamage}\n` +
            `❤️ Tu ${battle.player.displayName}: ${result.playerHp}/${result.playerMaxHp} HP\n`

        if (result.playerFainted) {
            cleanupWildBattle(battle.id, m.sender)
            text += `\n💀 *¡Tu Pokémon se debilitó!* ${battle.wild.displayName} huyó.`
            return m.reply(text)
        }

        text += `\n🔄 Es tu turno.`
        return m.reply(text)
    }

    // ---- wswitch ----
    if (['wswitch', 'wcambiar', 'wildswitch', 'cambiar'].includes(command)) {
        if (battle.status !== 'battling') {
            return m.reply(`❌ Inicia la batalla primero con *${usedPrefix}wattack*`)
        }
        if (!args[0]) {
            let list = `🔄 *CAMBIA TU POKÉMON*\n${'═'.repeat(30)}\n\n`
            team.forEach((pokeData, i) => {
                const poke = Pokemon.fromJSON(pokeData)
                const status = poke.currentHp > 0 ? '✅' : '❌'
                const current = (i === 0) ? ' (ACTUAL)' : ''
                list += `${i+1}. ${poke.shiny?'✨ ':''}${poke.displayName} (Nv.${poke.level}) ${status}${current}\n`
            })
            list += `\n💡 Usa: *${usedPrefix}wswitch [número]*`
            return m.reply(list)
        }

        const idx = parseInt(args[0]) - 1
        if (isNaN(idx) || idx < 0 || idx >= team.length) {
            return m.reply(`❌ Número inválido. Tienes ${team.length} Pokémon.`)
        }
        if (idx === 0) return m.reply(`❌ Ya estás usando a ${team[0].displayName}`)

        const newPokemon = Pokemon.fromJSON(team[idx])
        const oldPokemon = battle.player

        const result = battle.switchPokemon(newPokemon, oldPokemon)
        if (result.error) return m.reply(`❌ ${result.error}`)

        team[idx] = team[0]
        team[0] = battle.player.toJSON()
        user.pokemonV1.team = team

        let text = `🔄 *${result.oldName} vuelve.*\n⚔️ *¡Salta ${result.newName}!*\n\n`
        text += `🌿 *${battle.wild.displayName} ataca!*\n💥 Daño: ${result.wildDamage}\n` +
            `❤️ Tu ${battle.player.displayName}: ${result.playerHp}/${result.playerMaxHp} HP\n`

        if (result.playerFainted) {
            cleanupWildBattle(battle.id, m.sender)
            text += `\n💀 *¡Tu Pokémon se debilitó!* ${battle.wild.displayName} huyó.`
            return m.reply(text)
        }

        text += `\n🔄 Es tu turno.`
        return m.reply(text)
    }

    // ---- wcatch ----
    if (['wcatch', 'wcapturar', 'wildcatch'].includes(command)) {
        const ballId = args[0]?.toLowerCase() || 'pokeball'
        if (!ITEMS[ballId] || ITEMS[ballId].type !== 'ball') {
            return m.reply(`❌ Ball no válida. Usa: pokeball, greatball, ultraball, masterball`)
        }
        if (!(user.pokemonV1.inventory?.[ballId] > 0)) {
            return m.reply(`❌ No tienes ${ITEMS[ballId].name}`)
        }

        if (battle.status === 'active') {
            battle.startBattle()
        }

        const result = battle.attemptCatch(ballId, user.pokemonV1.inventory, (item, qty) => useItem(user, item, qty))
        useItem(user, ballId, 1)

        if (result.error) return m.reply(`❌ ${result.error}`)

        if (!result.success) {
            let text = `😓 *¡La captura falló!* ${battle.wild.displayName} se liberó.\n` +
                `📦 Te quedan ${user.pokemonV1.inventory[ballId] || 0} ${ITEMS[ballId].name}(s).\n`

            if (result.fled) {
                cleanupWildBattle(battle.id, m.sender)
                text += `\n🏃 *¡El Pokémon huyó!*`
                return m.reply(text)
            }

            if (result.wildDamage > 0) {
                team[0] = battle.player.toJSON()
                user.pokemonV1.team = team
                text += `\n🌿 ${battle.wild.displayName} contraataca!\n💥 Daño: ${result.wildDamage}\n` +
                    `❤️ Tu ${battle.player.displayName}: ${result.playerHp}/${battle.player.stats.maxHp} HP\n`
                if (result.playerFainted) {
                    cleanupWildBattle(battle.id, m.sender)
                    text += `\n💀 *¡Tu Pokémon se debilitó!* ${battle.wild.displayName} huyó.`
                } else {
                    text += `\n🔄 Sigue tu turno. Intenta de nuevo con *${usedPrefix}wcatch* o ataca.`
                }
            } else {
                text += `\n🔄 Puedes intentar de nuevo.`
            }
            return m.reply(text)
        }

        // Captura exitosa
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
            location = `📦 Caja (${box.length}/${MAX_BOX})`
        }

        user.pokemonV1.caught++
        user.pokemonV1.totalXpGained += xpGained
        cleanupWildBattle(battle.id, m.sender)

        let text = `🎉 *¡Captura exitosa!*\n\n${wild.shiny ? '✨ ' : ''}*${wild.displayName}* atrapado\n` +
            `📊 Nivel: ${wild.level}\n🔸 Tipo: ${wild.types.map(t => getTypeEmoji(t)).join(' ')} ${wild.types.join('/')}\n` +
            `📍 ${location}\n\n💡 XP ganada: +${formatNumber(xpGained)}\n`

        if (xpResult.leveledUp) {
            text += `⬆️ *¡Subió al nivel ${xpResult.newLevel}!*\n`
        }
        text += `\nUsa *${usedPrefix}team* para ver tu equipo.`
        return m.reply(text)
    }

    // ---- wrun ----
    if (['wrun', 'whuir', 'wildrun'].includes(command)) {
        const result = battle.run()
        if (result.error) return m.reply(`❌ ${result.error}`)
        cleanupWildBattle(battle.id, m.sender)
        return m.reply(`🏃 *¡Huiste del ${battle.wild.displayName} salvaje!*`)
    }

    return m.reply(`❌ Comando desconocido. Usa *${usedPrefix}wild* para buscar.`)
}

handler.help = ['wild', 'wattack', 'wcatch', 'wuse', 'wswitch', 'wrun']
handler.tags = ['pokemon-v1']
handler.command = [
    'wild', 'buscar',
    'wattack', 'watacar', 'wildattack',
    'wcatch', 'wcapturar', 'wildcatch',
    'wuse', 'wusar', 'wilduse',
    'wswitch', 'wcambiar', 'wildswitch', 'cambiar',
    'wrun', 'whuir', 'wildrun'
]
handler.group = true

export default handler