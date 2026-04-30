/**
 * Comando: .setroute <ruta>
 * Cambia la ruta actual del entrenador.
 * Rutas disponibles: 1-25 o nombres especiales: mt_moon, rock_tunnel, etc.
 */

import { initUser, isInAnyBattle } from './lib/utils.js'
import { ROUTES, getAvailableRoutes } from './lib/routes.js'

let handler = async (m, { conn, usedPrefix, args }) => {  // ← añadido usedPrefix
    if (isInAnyBattle(m.sender)) {
        return m.reply('❌ No puedes cambiar de ruta mientras estás en batalla.')
    }

    if (!args[0]) {
        const user = initUser(m.sender, m.pushName)
        const current = user.pokemonV1.currentRoute
        const currentInfo = ROUTES[current] || { name: 'Ruta desconocida' }
        const routesList = getAvailableRoutes().map(r => `${r.id} (${r.name})`).join(', ')
        return m.reply(`📍 *Ruta actual:* ${currentInfo.name}\n\n📋 *Rutas disponibles:*\n${routesList}\n\n💡 Usa: *${usedPrefix}setroute [número o nombre]*`)
    }

    const user = initUser(m.sender, m.pushName)
    let newRoute = args[0].toLowerCase()

    // Intentar convertir a número si es un número
    const routeNum = parseInt(newRoute)
    if (!isNaN(routeNum)) {
        newRoute = routeNum
    }

    // Verificar si la ruta existe
    const routeInfo = ROUTES[newRoute]
    if (!routeInfo) {
        const available = getAvailableRoutes().slice(0, 10).map(r => `${r.id}`).join(', ')
        return m.reply(`❌ Ruta no encontrada. Opciones: ${available} y más. Usa *${usedPrefix}setroute* sin argumentos para ver la lista completa.`)
    }

    user.pokemonV1.currentRoute = newRoute
    m.reply(`✅ Ahora estás en *${routeInfo.name}*. Los Pokémon salvajes aparecerán según esta zona.`)
}

handler.help = ['setroute', 'setruta']
handler.tags = ['pokemon-v1']
handler.command = ['setroute', 'setruta']
handler.group = true

export default handler