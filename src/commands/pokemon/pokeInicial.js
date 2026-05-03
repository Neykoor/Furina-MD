/**
 * Comando: .oak / .profesor
 * Elige tu primer Pokémon entre Bulbasaur, Charmander y Squirtle
 */

import { Pokemon } from './lib/pokemon.js'
import { initUser } from './lib/utils.js'
import { getSpanishName } from './lib/data.js'

// IDs de los iniciales de Kanto
const STARTERS = [
    { id: 1, name: 'Bulbasaur', emoji: '🌿' },   // Bulbasaur
    { id: 4, name: 'Charmander', emoji: '🔥' },  // Charmander
    { id: 7, name: 'Squirtle', emoji: '💧' }     // Squirtle
]

let handler = async (m, { conn, usedPrefix, command, args }) => {
    // Se permite en cualquier chat (grupo o privado)

    const user = initUser(m.sender, m.pushName)
    const pokeData = user.pokemonV1

    // Verificar si ya ha reclamado un inicial o ya tiene Pokémon
    if (pokeData.starterClaimed) {
        return m.reply(`❌ Ya has recibido tu Pokémon inicial del Profesor Oak.`)
    }
    if (pokeData.team && pokeData.team.length > 0) {
        // Si ya tiene Pokémon, marcamos como reclamado para que no pueda usar el comando
        pokeData.starterClaimed = true
        return m.reply(`❌ Ya tienes Pokémon en tu equipo. No puedes recibir otro inicial.`)
    }

    // Si no hay argumento, mostrar opciones con botones (si el conector lo soporta)
    if (!args[0]) {
        const sections = [{
            title: '🌳 Laboratorio del Profesor Oak',
            rows: STARTERS.map((s, i) => ({
                title: `${s.emoji} ${getSpanishName(s.id)}`,
                description: `Tipo: ${s.emoji}`,
                rowId: `${usedPrefix}${command} ${i + 1}`
            }))
        }]

        const buttonMessage = {
            text: `👴 *PROFESOR OAK:*\n\n` +
                  `¡Hola, joven entrenador! Bienvenido al mundo Pokémon.\n` +
                  `Para comenzar tu aventura, elige uno de estos tres Pokémon:\n\n` +
                  `1️⃣ 🌿 Bulbasaur - Tipo Planta/Veneno\n` +
                  `2️⃣ 🔥 Charmander - Tipo Fuego\n` +
                  `3️⃣ 💧 Squirtle - Tipo Agua\n\n` +
                  `✏️ Responde con el número (1, 2 o 3) o usa los botones.`,
            footer: 'Laboratorio Pokémon',
            buttons: [
                { buttonId: `${usedPrefix}${command} 1`, buttonText: { displayText: '1️⃣ Bulbasaur' }, type: 1 },
                { buttonId: `${usedPrefix}${command} 2`, buttonText: { displayText: '2️⃣ Charmander' }, type: 1 },
                { buttonId: `${usedPrefix}${command} 3`, buttonText: { displayText: '3️⃣ Squirtle' }, type: 1 }
            ],
            viewOnce: true
        }

        // Intentar enviar con botones; si falla, enviar texto plano
        try {
            return await conn.sendMessage(m.chat, buttonMessage)
        } catch (e) {
            // Fallback a texto simple
            return m.reply(
                `👴 *PROFESOR OAK:*\n\n` +
                `¡Hola, joven entrenador! Elige tu primer Pokémon:\n\n` +
                `1️⃣ 🌿 Bulbasaur\n` +
                `2️⃣ 🔥 Charmander\n` +
                `3️⃣ 💧 Squirtle\n\n` +
                `✏️ Escribe *${usedPrefix}${command} <número>* (ejemplo: ${usedPrefix}${command} 1)`
            )
        }
    }

    // Procesar selección
    const choice = parseInt(args[0])
    if (isNaN(choice) || choice < 1 || choice > 3) {
        return m.reply(`❌ Opción inválida. Elige 1, 2 o 3.`)
    }

    const selected = STARTERS[choice - 1]
    const starterLevel = 5 // Nivel inicial decente

    try {
        // Crear el Pokémon usando el método createWild con nivel forzado
        const pokemon = await Pokemon.createWild(selected.id, starterLevel)
        
        // Asignar al usuario
        pokemon.caughtBy = m.sender
        pokemon.caughtAt = Date.now()
        
        // Asegurar que tiene HP completo
        pokemon.currentHp = pokemon.stats.maxHp
        
        // Añadir al equipo
        pokeData.team.push(pokemon.toJSON())
        pokeData.caught = (pokeData.caught || 0) + 1
        pokeData.starterClaimed = true

        // Mensaje de éxito con imagen
        const shinyText = pokemon.shiny ? '✨ ' : ''
        const typeEmojis = pokemon.types.map(t => {
            const emojiMap = { grass: '🌿', fire: '🔥', water: '💧', poison: '☠️', flying: '🕊️' }
            return emojiMap[t] || '❓'
        }).join('')

        const caption = 
            `🎉 *¡FELICIDADES, ENTRENADOR!* 🎉\n\n` +
            `Has elegido a *${shinyText}${pokemon.displayName}* como tu primer Pokémon.\n\n` +
            `📊 *Estadísticas iniciales:*\n` +
            `🔸 Nivel: ${pokemon.level}\n` +
            `🔸 Tipo: ${typeEmojis} ${pokemon.types.join('/')}\n` +
            `❤️ HP: ${pokemon.stats.maxHp}\n` +
            `⚔️ Ataque: ${pokemon.stats.attack}\n` +
            `🛡️ Defensa: ${pokemon.stats.defense}\n` +
            `💨 Velocidad: ${pokemon.stats.speed}\n\n` +
            `🌍 ¡Tu aventura Pokémon comienza ahora!\n` +
            `Usa *${usedPrefix}team* para ver tu equipo y *${usedPrefix}wild* para buscar Pokémon salvajes.`

        // Enviar imagen del Pokémon
        try {
            await conn.sendMessage(m.chat, {
                image: { url: pokemon.artwork || pokemon.sprite },
                caption: caption,
                mentions: [m.sender]
            })
        } catch {
            await m.reply(caption)
        }

    } catch (error) {
        console.error('Error al crear Pokémon inicial:', error)
        return m.reply(`❌ Ocurrió un error al generar tu Pokémon. Intenta de nuevo más tarde.`)
    }
}

handler.help = ['oak', 'profesor']
handler.tags = ['pokemon']
handler.command = ['oak', 'profesor', 'starter']

export default handler