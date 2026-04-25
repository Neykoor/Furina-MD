/**
 * Cliente minimalista de PokeAPI
 * Ahora incluye artwork oficial (alta resolución)
 */

const BASE_URL = 'https://pokeapi.co/api/v2'
const ARTWORK_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

// Cache simple en memoria
const cache = new Map()

export async function fetchPokemon(idOrName) {
    const key = `pokemon_${idOrName}`
    
    if (cache.has(key)) {
        return cache.get(key)
    }

    try {
        const res = await fetch(`${BASE_URL}/pokemon/${idOrName}`)
        if (!res.ok) throw new Error('Not found')
        
        const data = await res.json()
        
        // Construir URL del artwork oficial
        const artworkUrl = `${ARTWORK_BASE}/${data.id}.png`
        
        const simplified = {
            id: data.id,
            name: data.name,
            sprite: data.sprites.front_default,
            shinySprite: data.sprites.front_shiny,
            artwork: artworkUrl,                     // ← NUEVO
            types: data.types.map(t => t.type.name),
            stats: {
                hp: data.stats.find(s => s.stat.name === 'hp').base_stat,
                attack: data.stats.find(s => s.stat.name === 'attack').base_stat,
                defense: data.stats.find(s => s.stat.name === 'defense').base_stat,
                speed: data.stats.find(s => s.stat.name === 'speed').base_stat
            }
        }
        
        cache.set(key, simplified)
        return simplified
        
    } catch (error) {
        console.error('PokeAPI error:', error)
        return null
    }
}

export async function preloadKanto() {
    console.log('🔄 Precargando Kanto...')
    const promises = []
    
    for (let i = 1; i <= 151; i++) {
        promises.push(fetchPokemon(i))
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 100))
    }
    
    await Promise.all(promises)
    console.log('✅ Kanto listo')
}