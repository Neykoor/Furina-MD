/**
 * Comando: .mochila / .inventario
 * Muestra los items del entrenador
 */

import { initUser } from '../../lib/pokemon-v1/utils.js'
import { formatInventory, ITEMS } from '../../lib/pokemon-v1/items.js'

let handler = async (m, { conn, usedPrefix }) => {
    const user = initUser(m.sender, m.pushName)
    const inventory = user.pokemonV1.inventory || {}
    
    const { lines, totalItems } = formatInventory(inventory, ITEMS)
    
    let text = `🎒 *MOCHILA POKÉMON* 🎒\n${'═'.repeat(30)}\n`
    
    if (lines.length === 0) {
        text += `\n📭 Tu mochila está vacía.\n`
        text += `Consigue items explorando o en la tienda próximamente.\n`
    } else {
        text += `\n` + lines.join('\n') + `\n`
        text += `\n${'═'.repeat(30)}\n`
        text += `📦 Total items: ${totalItems}\n`
    }
    
    text += `\n💡 *Uso de items:*\n`
    text += `• Próximamente podrás usar items en batalla.\n`
    text += `• Para curar a tu Pokémon usa el comando correspondiente.`
    
    await conn.sendMessage(m.chat, {
        text,
        mentions: [m.sender]
    })
}

handler.help = ['mochila', 'inventario', 'bag']
handler.tags = ['pokemon-v1']
handler.command = ['mochila', 'inventario', 'bag', 'inventory']

export default handler