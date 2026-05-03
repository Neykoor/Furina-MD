/**
 * Comando: .centropokemon / .curar
 * Restaura la salud de tus Pokémon (cooldown 1 minuto)
 * No se puede usar si estás en batalla (PvP o salvaje)
 */

import { Pokemon } from './lib/pokemon.js'
import { initUser, isInAnyBattle } from './lib/utils.js'

const HEAL_COOLDOWN = 60 * 1000 // 1 minuto

let handler = async (m, { conn, usedPrefix, args, command }) => {
    // Verificar si está en batalla
    if (isInAnyBattle(m.sender)) {
        return m.reply(`❌ No puedes usar el Centro Pokémon mientras estás en una batalla.\nTermina o huye primero.`)
    }

    let user = initUser(m.sender, m.pushName), team = user.pokemonV1.team
    if (!team?.length) return m.reply(`❌ No tienes Pokémon en tu equipo.`)

    let now = Date.now(), lastHeal = user.pokemonV1.lastHealV1 || 0, cooldown = HEAL_COOLDOWN - (now - lastHeal)
    let isOwner = global.owner?.some(o => o + '@s.whatsapp.net' === m.sender) || false

    if (cooldown > 0 && !isOwner && args[0] !== 'force') {
        let minutes = Math.floor(cooldown / 60000)
        let seconds = Math.ceil((cooldown % 60000) / 1000)
        return m.reply(`⏳ *Centro Pokémon en enfriamiento*\n\nPodrás curar de nuevo en ${minutes}m ${seconds}s.`)
    }

    let idx = parseInt(args[0]) - 1, healed = []
    if (!isNaN(idx + 1)) {
        if (idx < 0 || idx >= team.length) return m.reply(`❌ Número inválido. Tienes ${team.length} Pokémon.`)
        let p = Pokemon.fromJSON(team[idx])
        if (p.currentHp === p.stats.maxHp) return m.reply(`✅ ${p.displayName} ya tiene la salud al máximo.`)
        healed.push({ name: p.displayName, shiny: p.shiny, oldHp: p.currentHp, newHp: p.stats.maxHp })
        p.currentHp = p.stats.maxHp
        team[idx] = p.toJSON()
    } else {
        team.forEach((t, i) => {
            let p = Pokemon.fromJSON(t)
            if (p.currentHp < p.stats.maxHp) {
                healed.push({ name: p.displayName, shiny: p.shiny, oldHp: p.currentHp, newHp: p.stats.maxHp })
                p.currentHp = p.stats.maxHp
                team[i] = p.toJSON()
            }
        })
    }

    if (!healed.length) return m.reply(`✅ Todos tus Pokémon ya tienen la salud al máximo.`)

    if (!isOwner || args[0] !== 'force') user.pokemonV1.lastHealV1 = now

    let text = `🏥 *CENTRO POKÉMON* 🏥\n${'═'.repeat(30)}\n\n✨ *Pokémon restaurados:*\n\n`
    healed.forEach(p => text += `❤️ ${p.shiny ? '✨ ' : ''}*${p.name}*\n   ${p.oldHp} ➜ ${p.newHp} HP\n\n`)
    text += `${'═'.repeat(30)}\n⏳ Próxima curación disponible en 1 minuto.\n💡 Usa *${usedPrefix}curar [número]* para curar un Pokémon específico.`

    await conn.sendMessage(m.chat, { text, mentions: [m.sender] })
}

handler.help = ['centropokemon', 'curar', 'heal']
handler.tags = ['pokemon-v1']
handler.command = ['centropokemon', 'centro', 'curar', 'heal']
handler.group = true

export default handler