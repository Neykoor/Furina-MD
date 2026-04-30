/**
 * Comando: .release
 * Libera un Pokémon (equipo o caja) y da XP.
 * No se puede usar si estás en batalla.
 */

import { Pokemon } from './lib/pokemon.js'
import { initUser, formatNumber, isInAnyBattle } from './lib/utils.js'

const pendingReleases = new Map()

// XP por liberar (50% de lo que daría capturar)
function calculateReleaseXp(pokemon) {
    let baseXp = 5
    baseXp += pokemon.level
    if (pokemon.shiny) baseXp *= 2
    return Math.floor(baseXp)
}

let handler = async (m, { conn, usedPrefix, args }) => {
    // Verificar si está en batalla
    if (isInAnyBattle(m.sender)) {
        return conn.sendMessage(m.chat, {
            text: `❌ No puedes liberar Pokémon mientras estás en una batalla.`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    const user = initUser(m.sender, m.pushName)
    const location = args[0]?.toLowerCase()
    const index = parseInt(args[1]) - 1

    if (!location || isNaN(index)) {
        const teamCount = user.pokemonV1.team.length
        const boxCount = user.pokemonV1.box.length
        return conn.sendMessage(m.chat, {
            text:
                `🗑️ *LIBERAR POKÉMON*\n\n` +
                `⚠️ *ADVERTENCIA: Esta acción no se puede deshacer*\n\n` +
                `Al liberar ganas XP (menos que al capturar).\n\n` +
                `📊 Tus Pokémon:\n` +
                `• Equipo: ${teamCount}/6\n` +
                `• Caja: ${boxCount}\n\n` +
                `*Uso:*\n` +
                `• *${usedPrefix}release team [número]* - Liberar del equipo\n` +
                `• *${usedPrefix}release box [número]* - Liberar de la caja\n\n` +
                `Ejemplo: *${usedPrefix}release team 2*`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    if (location !== 'team' && location !== 'box') {
        return conn.sendMessage(m.chat, {
            text: `❌ Ubicación inválida. Usa 'team' o 'box'`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    const list = location === 'team' ? user.pokemonV1.team : user.pokemonV1.box
    if (index < 0 || index >= list.length) {
        return conn.sendMessage(m.chat, {
            text: `❌ Número inválido.`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    const pokemonData = list[index]
    const pokemon = Pokemon.fromJSON(pokemonData)
    const pokemonName = pokemon.displayName
    const isShiny = pokemon.shiny ? '✨ ' : ''

    const pendingKey = `${m.sender}_${location}_${index}`
    const pending = pendingReleases.get(pendingKey)

    if (!pending || Date.now() - pending.time > 30000) {
        const xpGain = calculateReleaseXp(pokemon)
        pendingReleases.set(pendingKey, {
            time: Date.now(),
            pokemon: pokemonName,
            xp: xpGain
        })
        setTimeout(() => pendingReleases.delete(pendingKey), 30000)

        return conn.sendMessage(m.chat, {
            text:
                `⚠️ *CONFIRMAR LIBERACIÓN*\n\n` +
                `¿Seguro que quieres liberar a:\n` +
                `${isShiny}*${pokemonName}* (Nv.${pokemon.level})?\n\n` +
                `💡 Ganarás *+${formatNumber(xpGain)} XP* al liberarlo.\n\n` +
                `Escribe el mismo comando de nuevo para confirmar:\n` +
                `*${usedPrefix}release ${location} ${index + 1}*\n\n` +
                `(Expira en 30 segundos)`,
            mentions: [m.sender]
        }, { quoted: m })
    }

    // Confirmado
    const xpGained = pending.xp
    user.pokemonV1.totalXpGained += xpGained
    list.splice(index, 1)
    user.pokemonV1.released++
    pendingReleases.delete(pendingKey)

    const farewells = [
        `🕊️ *${pokemonName}* ha sido liberado. ¡Adiós, amigo!`,
        `🌳 *${pokemonName}* regresó a la naturaleza.`,
        `✨ *${pokemonName}* te agradece y parte.`,
        `🎋 *${pokemonName}* se fue a nuevas aventuras.`
    ]
    const msg = farewells[Math.floor(Math.random() * farewells.length)]

    return conn.sendMessage(m.chat, {
        text:
            `${msg}\n\n` +
            `💡 Ganaste *+${formatNumber(xpGained)} XP* por liberarlo.\n\n` +
            `📊 Ahora tienes:\n` +
            `• Equipo: ${user.pokemonV1.team.length}/6\n` +
            `• Caja: ${user.pokemonV1.box.length}\n` +
            `• Total liberados: ${user.pokemonV1.released}`,
        mentions: [m.sender]
    }, { quoted: m })
}

handler.help = ['release', 'liberar', 'soltar']
handler.tags = ['pokemon-v1']
handler.command = ['release', 'liberar', 'soltar']
handler.group = true

export default handler