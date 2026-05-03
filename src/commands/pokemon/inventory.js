/**
 * Comando: .mochila / .inventario
 * Muestra los items del entrenador.
 * No se puede usar si estás en batalla.
 */

import { initUser, isInAnyBattle } from './lib/utils.js'
import { formatInventory, ITEMS } from './lib/items.js'

let handler = async (m, { conn, usedPrefix }) => {
    // Verificar si está en batalla
    if (isInAnyBattle(m.sender)) {
        return m.reply(`❌ No puedes revisar tu mochila mientras estás en una batalla.`)
    }

    const user = initUser(m.sender, m.pushName)
    const inventory = user.pokemonV1.inventory || {}
    
    const { lines, totalItems } = formatInventory(inventory, ITEMS)
    
    let text = `🎒 *MOCHILA POKÉMON* 🎒\n${'═'.repeat(30)}\n`
    
    if (lines.length === 0) {
        text += `\n📭 Tu mochila está vacía.\n`
        text += `Consigue items explorando con *${usedPrefix}rebuscar*.\n`
    } else {
        text += `\n` + lines.join('\n') + `\n`
        text += `\n${'═'.repeat(30)}\n`
        text += `📦 Total items: ${totalItems}\n`
    }
    
    text += `\n💡 *Uso de items:*\n`
    text += `• En batalla PvP: *${usedPrefix}use [item]*\n`
    text += `• En batalla salvaje: *${usedPrefix}wuse [item]*\n`
    text += `• Para curar fuera de combate usa *${usedPrefix}curar*`
    
    await conn.sendMessage(m.chat, { text, mentions: [m.sender] })
}

handler.help = ['mochila', 'inventario', 'bag']
handler.tags = ['pokemon-v1']
handler.command = ['mochila', 'inventario', 'bag', 'inventory']
handler.group = true

export default handler