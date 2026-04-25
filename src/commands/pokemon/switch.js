import { Pokemon } from './lib/pokemon.js'
import { initUser } from './lib/utils.js'

let handler = async (m, { conn, usedPrefix, args }) => {
  const u = initUser(m.sender, m.pushName), team = u.pokemonV1.team, box = u.pokemonV1.box
  const cmd = args[0]?.toLowerCase()
  
  // Mostrar ayuda
  if (!cmd || !['tobox','toteam','swap'].includes(cmd)) {
    return m.reply(`🔄 *CAMBIAR POKÉMON*\n\n*${usedPrefix}switch tobox [n]* - Mover del equipo a caja\n*${usedPrefix}switch toteam [n]* - Mover de caja a equipo\n*${usedPrefix}switch swap [a] [b]* - Intercambiar equipo\n\n📊 Equipo: ${team.length}/6 | Caja: ${box.length}`)
  }
  
  // Mover equipo -> caja
  if (cmd === 'tobox') {
    if (team.length <= 1) return m.reply('❌ No puedes quedarte sin Pokémon en el equipo.')
    const idx = parseInt(args[1]) - 1
    if (isNaN(idx) || idx<0 || idx>=team.length) return m.reply(`❌ Índice inválido (1-${team.length})`)
    const [p] = team.splice(idx, 1)
    box.push(Pokemon.fromJSON(p).toJSON()) // Clon limpio
    return m.reply(`✅ ${p.displayName} movido a la caja.\n📊 Equipo: ${team.length}/6 | Caja: ${box.length}`)
  }
  
  // Mover caja -> equipo
  if (cmd === 'toteam') {
    if (team.length >= 6) return m.reply('❌ Equipo lleno (6/6).')
    const idx = parseInt(args[1]) - 1
    if (isNaN(idx) || idx<0 || idx>=box.length) return m.reply(`❌ Índice inválido (1-${box.length})`)
    const [p] = box.splice(idx, 1)
    team.push(Pokemon.fromJSON(p).toJSON()) // Clon limpio
    return m.reply(`✅ ${p.displayName} movido al equipo.\n📊 Equipo: ${team.length}/6 | Caja: ${box.length}`)
  }
  
  // Intercambiar posiciones en equipo
  if (cmd === 'swap') {
    const a = parseInt(args[1]) - 1, b = parseInt(args[2]) - 1
    if (isNaN(a) || isNaN(b) || a<0 || b<0 || a>=team.length || b>=team.length) 
      return m.reply(`❌ Índices inválidos. Tienes ${team.length} Pokémon.`)
    if (a === b) return m.reply('❌ Las posiciones son iguales.')
    ;[team[a], team[b]] = [Pokemon.fromJSON(team[b]).toJSON(), Pokemon.fromJSON(team[a]).toJSON()]
    return m.reply(`✅ ${team[a].displayName} ↔ ${team[b].displayName} intercambiados.`)
  }
}
handler.help = ['switch']
handler.tags = ['pokemon-v1']
handler.command = ['switch', 'mover', 'swap']
handler.group = true

export default handler