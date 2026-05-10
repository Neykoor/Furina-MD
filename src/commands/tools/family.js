import { getOrCreateUser } from '../../../lib/users.js'
import { 
    getFamilyData, 
    adoptChild, 
    removeChild, 
    buildFamilyTree, 
    formatFamilyTree, 
    getRelationLabel, 
    getFamilyStats,
    getPendingProposal 
} from '../../../lib/family.js'

let handler = async (m, { conn, args, command }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)
        const family = getFamilyData(userId)

        if (command === 'family' || command === 'familia' || command === 'arbol') {
            
            // Sin args: mostrar árbol o estado
            if (!args || args.length === 0) {
                // Si tiene propuesta pendiente, mostrarla primero
                const pending = getPendingProposal(userId)
                if (pending) {
                    let txt = `💍 *Tienes una propuesta de matrimonio pendiente*\n\n`
                    txt += `De: @${pending.fromId}\n`
                    txt += `Usa *#marry accept* o *#marry reject*`
                    return await conn.sendMessage(m.chat, { 
                        text: txt, 
                        mentions: [pending.fromId + '@s.whatsapp.net'] 
                    }, { quoted: m })
                }

                const tree = buildFamilyTree(userId)
                const isEmpty = !tree || (tree.children.length === 0 && tree.parents.length === 0 && !tree.spouse)
                
                if (isEmpty) {
                    let txt = `🌳 *ÁRBOL GENEALÓGICO*\n\n`
                    txt += `👤 ${user.profile?.displayName || user.username}\n\n`
                    txt += `📭 Tu árbol está vacío.\n\n`
                    txt += `💡 Comandos:\n`
                    txt += `#marry @usuario - Casarte\n`
                    txt += `#family adopt @usuario - Adoptar hijo\n`
                    txt += `#family tree - Ver árbol completo\n`
                    txt += `#family stats - Ver estadísticas`
                    return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
                }

                const lines = formatFamilyTree(tree)
                let txt = `🌳 *ÁRBOL GENEALÓGICO DE ${user.profile?.displayName || user.username}*\n\n`
                txt += lines.join('\n') + '\n\n'
                txt += `📊 Usa #family stats para más detalles`
                return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }

            if (args[0] === 'tree' || args[0] === 'arbol') {
                const tree = buildFamilyTree(userId, new Set(), 0, 6)
                if (!tree) {
                    return await conn.sendMessage(m.chat, { 
                        text: `📭 Árbol vacío.` 
                    }, { quoted: m })
                }

                const lines = formatFamilyTree(tree)
                let txt = `🌳 *ÁRBOL GENEALÓGICO COMPLETO*\n\n`
                txt += '```\n' + lines.join('\n') + '\n```'
                return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }

            if (args[0] === 'stats' || args[0] === 'estadisticas') {
                const stats = getFamilyStats(userId)

                let txt = `📊 *ESTADÍSTICAS FAMILIARES*\n\n`
                txt += `👤 ${user.profile?.displayName || user.username}\n\n`
                txt += `💑 Cónyuge: ${stats.spouse ? '@' + stats.spouse : 'Soltero'}\n`
                txt += `👶 Hijos: ${stats.childrenCount}\n`
                txt += `👴 Padres: ${stats.parentsCount}\n`
                txt += `🧬 Generación: ${stats.generation}\n`
                txt += `👨‍👩‍👧‍👦 Descendientes totales: ${stats.descendants}\n`
                txt += `👆 Ancestros totales: ${stats.ancestors}\n`
                if (stats.marriedSince) {
                    const days = Math.floor((Date.now() - stats.marriedSince) / 86400000)
                    txt += `📅 Días casado: ${days}\n`
                }

                const mentions = stats.spouse ? [stats.spouse + '@s.whatsapp.net'] : []
                return await conn.sendMessage(m.chat, { text: txt, mentions }, { quoted: m })
            }

            if (args[0] === 'adopt' || args[0] === 'adoptar') {
                if (!args[1]) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Uso: #family adopt @usuario` 
                    }, { quoted: m })
                }

                const targetMention = args[1].replace(/[@\s]/g, '')
                const targetId = targetMention.split('@')[0].replace(/\D/g, '')

                if (!targetId || targetId === userId) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Menciona a alguien válido.` 
                    }, { quoted: m })
                }

                const result = adoptChild(userId, targetId)
                if (!result.success) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ ${result.error}` 
                    }, { quoted: m })
                }

                let txt = `👶 *ADOPCIÓN*\n\n`
                txt += `@${userId} ha adoptado a @${targetId} como hijo.\n\n`
                txt += `¡Bienvenido a la familia! 🎉`
                await conn.sendMessage(m.chat, { 
                    text: txt, 
                    mentions: [userId + '@s.whatsapp.net', targetId + '@s.whatsapp.net'] 
                }, { quoted: m })
                return
            }

            if (args[0] === 'disown' || args[0] === 'rechazar') {
                if (!args[1]) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Uso: #family disown @usuario` 
                    }, { quoted: m })
                }

                const targetMention = args[1].replace(/[@\s]/g, '')
                const targetId = targetMention.split('@')[0].replace(/\D/g, '')

                if (!family.children.includes(targetId)) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Esa persona no es tu hijo.` 
                    }, { quoted: m })
                }

                const result = removeChild(userId, targetId)
                let txt = `🚫 *HIJO RECHAZADO*\n\n`
                txt += `@${targetId} ya no es hijo de @${userId}.`
                await conn.sendMessage(m.chat, { 
                    text: txt, 
                    mentions: [userId + '@s.whatsapp.net', targetId + '@s.whatsapp.net'] 
                }, { quoted: m })
                return
            }

            if (args[0] === 'relation' || args[0] === 'relacion') {
                if (!args[1]) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Uso: #family relation @usuario` 
                    }, { quoted: m })
                }

                const targetMention = args[1].replace(/[@\s]/g, '')
                const targetId = targetMention.split('@')[0].replace(/\D/g, '')

                if (!targetId) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ Menciona a alguien.` 
                    }, { quoted: m })
                }

                const label = getRelationLabel(userId, targetId)
                const target = getOrCreateUser(targetId)

                let txt = `🔗 *RELACIÓN*\n\n`
                txt += `Tú y @${targetId} sois: *${label}*\n\n`
                txt += `${target.profile?.displayName || target.username}`
                await conn.sendMessage(m.chat, { 
                    text: txt, 
                    mentions: [targetId + '@s.whatsapp.net'] 
                }, { quoted: m })
                return
            }
        }

    } catch (error) {
        console.error('Error en family:', error)
        await conn.sendMessage(m.chat, { 
            text: `❌ Error: ${error.message}` 
        }, { quoted: m })
    }
}

handler.help = ['family', 'family adopt @user', 'family disown @user', 'family tree', 'family stats', 'family relation @user']
handler.tags = ['tools', 'family']
handler.command = ['family', 'familia', 'arbol']

export default handler
