import { getOrCreateUser, updateUser, addExp, formatMoney } from '../../../lib/users.js'
import { RECETAS_CRAFTEO, getItem } from '../../../lib/economy/items.js'
import { canCraft, craftItem, getInventory } from '../../../lib/economy/inventory.js'
import { updateMissionProgress } from '../../../lib/economy/missions.js'
import { updateStats } from '../../../lib/economy/stats.js'

let handler = async (m, { conn, args }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)

        if (!args || args.length === 0) {
            let txt = `🔨 *MESA DE CRAFTEO*\n\n`
            txt += `Usa: *#craft <nombre>* para craftear\n`

            const categorias = {
                herramienta: '🔧 Herramientas',
                arma: '⚔️ Armas',
                armadura: '🛡️ Armaduras',
                accesorio: '💍 Accesorios',
                consumible: '🧪 Consumibles'
            }

            for (const [tipo, nombre] of Object.entries(categorias)) {
                const recetas = Object.values(RECETAS_CRAFTEO).filter(r => r.tipo === tipo)
                if (recetas.length === 0) continue

                txt += `\n${nombre}:\n`
                for (const receta of recetas) {
                    const check = canCraft(userId, receta.id)
                    const status = check.can ? '✅' : '❌'
                    const reqs = Object.entries(receta.requiere).map(([id, cant]) => {
                        const item = getItem(id)
                        const have = getInventory(userId)[id]?.cantidad || 0
                        return `${item?.emoji || ''}${item?.nombre || id} ${have}/${cant}`
                    }).join(', ')

                    txt += `  ${status} *${receta.emoji} ${receta.nombre}* (Nv.${receta.nivel})\n`
                    txt += `     └ ${reqs}\n`
                }
            }

            txt += `\n💡 Escribe *#craft <nombre>* para intentar craftear`
            return await conn.reply(m.chat, txt, m)
        }

        const search = args.join(' ').toLowerCase()
        const recetaId = Object.keys(RECETAS_CRAFTEO).find(id => 
            RECETAS_CRAFTEO[id].nombre.toLowerCase().includes(search) ||
            RECETAS_CRAFTEO[id].id === search
        )

        if (!recetaId) {
            return await conn.reply(m.chat, `❌ Receta no encontrada. Usa *#craft* para ver las recetas disponibles.`, m)
        }

        const receta = RECETAS_CRAFTEO[recetaId]

        if ((user.level || 1) < receta.nivel) {
            return await conn.reply(m.chat, `❌ Necesitas nivel ${receta.nivel} para craftear ${receta.nombre}.\nTu nivel actual: ${user.level || 1}`, m)
        }

        const result = craftItem(userId, recetaId)

        if (!result.success) {
            let txt = `❌ *No puedes craftear ${receta.nombre}*\n\n`
            txt += `Te faltan materiales:\n`
            for (const miss of result.missing || []) {
                const item = getItem(miss.item)
                txt += `  • ${item?.emoji || ''} ${item?.nombre || miss.item}: ${miss.have}/${miss.need}\n`
            }
            return await conn.reply(m.chat, txt, m)
        }

        const expResult = addExp(userId, receta.exp)

        updateStats(userId, 'craftear', { item: receta, cantidad: 1 })
        updateMissionProgress(userId, 'craftear', 1)

        let txt = `🔨 *¡CRAFTING EXITOSO!*\n\n`
        txt += `${receta.emoji} *${receta.nombre}*\n`
        txt += `✨ EXP: +${receta.exp}\n\n`
        txt += `📦 *Materiales usados:*\n`
        for (const [id, cant] of Object.entries(result.consumed)) {
            const item = getItem(id)
            txt += `  • ${item?.emoji || ''} ${item?.nombre || id} x${cant}\n`
        }

        if (receta.bonus) {
            txt += `\n⚡ *Bonus del item:*\n`
            for (const [key, val] of Object.entries(receta.bonus)) {
                if (key === 'durabilidad') continue
                const labels = { mineria: '⛏️ Minería', pesca: '🎣 Pesca', caza: '🏹 Caza', luck: '🍀 Suerte', exp_bonus: '✨ EXP', defensa: '🛡️ Defensa', danio: '⚔️ Daño', charisma: '💎 Carisma' }
                txt += `  ${labels[key] || key}: ${typeof val === 'number' && val < 10 ? `x${val.toFixed(1)}` : `+${val}`}\n`
            }
        }

        if (expResult.leveledUp) txt += `\n🎉 *¡SUBISTE AL NIVEL ${expResult.level}!*`

        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })

    } catch (error) {
        console.error('Error en craft:', error)
        await conn.reply(m.chat, `❌ *Error al ejecutar el comando*\n\n💡 Intenta de nuevo. Si el problema persiste, contacta al administrador.\n\n📝 Detalle: ${error.message}`, m)
    }
}

handler.help = ['craft', 'craftear']
handler.tags = ['economy', 'rpg']
handler.command = ['craft', 'craftear', 'fabricar']

export default handler
