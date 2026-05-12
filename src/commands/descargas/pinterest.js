import axios from 'axios'

const API_BASE = 'https://rest.kazuma.giize.com'
const API_KEY = 'kzm-BJyESIjG-FONfiuYH'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text?.trim()) {
        return conn.sendMessage(m.chat, {
            text: `✳️ *Uso:* ${usedPrefix}${command} <término de búsqueda>\n\n📌 Ejemplo:\n${usedPrefix}${command} anime aesthetic`
        }, { quoted: m })
    }

    await m.react('🔍')

    try {
        const { data } = await axios.get(`${API_BASE}/api/search/pinterest`, {
            params: { query: text.trim(), apiKey: API_KEY },
            timeout: 15000
        })

        const results = data.results || data.data || data.images || (Array.isArray(data) ? data : [data])
        if (!results?.length) throw new Error('No se encontraron imágenes')

        const images = results
            .map(v => v.url || v.image || v.src || v.link || v.image_url)
            .filter(Boolean)
            .slice(0, 6)

        if (!images.length) throw new Error('No se encontraron imágenes válidas')

        await m.react('⬆️')

        for (let i = 0; i < images.length; i++) {
            await conn.sendMessage(m.chat, {
                image: { url: images[i] },
                caption: `📌 Pinterest - ${text.trim().substring(0, 40)}\n📎 ${i + 1}/${images.length}`
            }, { quoted: i === 0 ? m : undefined })
            if (i < images.length - 1) await new Promise(r => setTimeout(r, 800))
        }

        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        conn.sendMessage(m.chat, { text: `❌ Error: ${err.message}` }, { quoted: m })
    }
}

handler.help = ['pinterest', 'pin']
handler.tags = ['descargas', 'busqueda']
handler.command = ['pinterest', 'pin']
handler.register = false
handler.group = false

export default handler
