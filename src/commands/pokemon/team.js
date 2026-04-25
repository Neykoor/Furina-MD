import { Pokemon } from './lib/pokemon.js'
import { getTypeEmoji, initUser, formatNumber } from './lib/utils.js'

// Formatea el detalle de un Pokémon individual
function formatPokemonDetail(pokemon, index, prefix) {
    const typeEmojis = pokemon.types.map(t => getTypeEmoji(t)).join(' ')
    const levelInfo = pokemon.level >= 100 ? '🏆' : ''
    const xpInfo = pokemon.level < 100
        ? `📈 ${pokemon.getXpBar()}`
        : `📈 XP Total: ${formatNumber(pokemon.xp)}`

    return `📊 *${pokemon.shiny ? '✨ ' : ''}${pokemon.displayName}*${levelInfo}\n` +
        `${'═'.repeat(30)}\n` +
        `🎖️ Nivel: ${pokemon.level}\n` +
        `${xpInfo}\n` +
        `🔸 Tipo: ${typeEmojis} ${pokemon.types.join('/')}\n` +
        `❤️ ${pokemon.getHpBar()}\n` +
        `⚔️ ATK: ${pokemon.stats.attack} | 🛡️ DEF: ${pokemon.stats.defense} | 💨 SPD: ${pokemon.stats.speed}\n` +
        `${'═'.repeat(30)}\n` +
        `📍 #${index + 1} | 📅 ${new Date(pokemon.caughtAt).toLocaleDateString()}\n` +
        `${pokemon.level < 100 ? `💡 *${prefix}train ${index + 1}*` : '🏆 Nivel máximo'}`
}

// Formatea la lista del equipo
function formatTeamList(teamData, boxCount, caught, trained, totalXp, prefix) {
    const teamLines = teamData.map((p, i) => {
        const pokemon = Pokemon.fromJSON(p) // Necesario para métodos como getHpBar y getXpPercent
        const levelBadge = pokemon.level >= 100 ? ' 🏆' : ''
        const hpBarShort = pokemon.getHpBar().split(' ')[0] // Ej: "[████░░░░░░]"
        const xpPercent = pokemon.level < 100 ? `   📈 ${pokemon.getXpPercent()}% al Nv.${pokemon.level + 1}\n` : ''
        return `${i + 1}. ${pokemon.shiny ? '✨ ' : ''}${pokemon.displayName}${levelBadge}\n` +
            `   Nv.${pokemon.level} ${pokemon.types.map(t => getTypeEmoji(t)).join('')} ${hpBarShort}\n` +
            xpPercent
    }).join('\n')

    return `⚔️ *EQUIPO* (${teamData.length}/6)\n${'═'.repeat(35)}\n${teamLines}\n${'═'.repeat(35)}\n` +
        `📦 Caja: ${boxCount} | 🎯 Capt: ${caught} | 💪 Entrenos: ${trained}\n` +
        `📊 XP total: ${formatNumber(totalXp)}\n` +
        `📋 *${prefix}pokemon [n]* | *${prefix}box* | *${prefix}train*`
}

let handler = async (m, { conn, usedPrefix, args, command }) => {
    const user = initUser(m.sender, m.pushName)
    const team = user.pokemonV1.team

    if (!team.length) {
        return m.reply(`❌ Sin Pokémon.\n*${usedPrefix}wild* para empezar.`)
    }

    const isDetailCommand = ['pokemon', 'poke'].includes(command)
    const idx = parseInt(args[0]) - 1

    // Mostrar detalle de un Pokémon específico
    if (isDetailCommand && !isNaN(idx) && idx >= 0 && idx < team.length) {
        const pokemon = Pokemon.fromJSON(team[idx])
        const caption = formatPokemonDetail(pokemon, idx, usedPrefix)
        try {
            await conn.sendMessage(m.chat, {
                image: { url: pokemon.artwork || pokemon.sprite },
                caption
            })
        } catch {
            await m.reply(caption)
        }
        return
    }

    // Mostrar lista del equipo
    const boxCount = user.pokemonV1.box.length
    const caught = user.pokemonV1.caught
    const trained = user.pokemonV1.trained
    const totalXp = user.pokemonV1.totalXpGained

    const text = formatTeamList(team, boxCount, caught, trained, totalXp, usedPrefix)
    await m.reply(text)
}

handler.help = ['team', 'pokemon']
handler.tags = ['pokemon-v1']
handler.command = ['team', 'equipo', 'pokemon', 'poke']
handler.group = true

export default handler