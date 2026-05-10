import { getOrCreateUser } from '../../../lib/users.js'
import { 
    getFamilyData, 
    proposeMarriage, 
    acceptMarriage, 
    rejectMarriage,
    getPendingProposal,
    divorce 
} from '../../../lib/family.js'

let handler = async (m, { conn, args, command }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)
        const family = getFamilyData(userId)

        // ─── MARRY / CASAR ───
        if (command === 'marry' || command === 'casar') {
            
            // Sin args: mostrar estado o ayuda
            if (!args || args.length === 0) {
                if (family.spouse) {
                    const spouse = getOrCreateUser(family.spouse)
                    const since = family.spouseSince 
                        ? new Date(family.spouseSince).toLocaleDateString('es-ES') 
                        : 'Desconocido'
                    const days = family.spouseSince 
                        ? Math.floor((Date.now() - family.spouseSince) / 86400000) 
                        : 0
                    
                    let txt = `💑 *ESTADO MATRIMONIAL*\n\n`
                    txt += `Casado con: @${family.spouse}\n`
                    txt += `Desde: ${since}\n`
                    txt += `Hijos: ${family.children.length}\n`
                    txt += `Días juntos: ${days}\n\n`
                    txt += `Usa *#divorce* para divorciarte`
                    return await conn.sendMessage(m.chat, { 
                        text: txt, 
                        mentions: [family.spouse + '@s.whatsapp.net'] 
                    }, { quoted: m })
                }

                // Ver si hay propuesta pendiente PARA MI
                const pendingForMe = getPendingProposal(userId)
                if (pendingForMe) {
                    const fromUser = getOrCreateUser(pendingForMe.fromId)
                    let txt = `💍 *PROPUESTA PENDIENTE*\n\n`
                    txt += `@${pendingForMe.fromId} te ha propuesto matrimonio.\n\n`
                    txt += `¿Aceptas?\n`
                    txt += `#marry accept - Aceptar\n`
                    txt += `#marry reject - Rechazar`
                    return await conn.sendMessage(m.chat, { 
                        text: txt, 
                        mentions: [pendingForMe.fromId + '@s.whatsapp.net'] 
                    }, { quoted: m })
                }

                let txt = `💍 *SISTEMA DE MATRIMONIO*\n\n`
                txt += `Para proponer matrimonio:\n`
                txt += `#marry @usuario\n\n`
                txt += `Para aceptar una propuesta:\n`
                txt += `#marry accept\n\n`
                txt += `Para rechazar:\n`
                txt += `#marry reject`
                return await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }

            // ─── ACCEPT / ACEPTAR ───
            if (args[0] === 'accept' || args[0] === 'aceptar') {
                const pending = getPendingProposal(userId)
                if (!pending) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ No tienes propuestas pendientes.` 
                    }, { quoted: m })
                }

                const result = acceptMarriage(userId, pending.fromId)
                if (!result.success) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ ${result.error}` 
                    }, { quoted: m })
                }

                let txt = `💍 *¡MATRIMONIO CELEBRADO!*\n\n`
                txt += `@${userId} + @${pending.fromId} = 💑\n\n`
                txt += `¡Que vivan los novios! 🎉`
                await conn.sendMessage(m.chat, { 
                    text: txt, 
                    mentions: [userId + '@s.whatsapp.net', pending.fromId + '@s.whatsapp.net'] 
                }, { quoted: m })
                return
            }

            // ─── REJECT / RECHAZAR ───
            if (args[0] === 'reject' || args[0] === 'rechazar') {
                const pending = getPendingProposal(userId)
                if (!pending) {
                    return await conn.sendMessage(m.chat, { 
                        text: `❌ No tienes propuestas pendientes.` 
                    }, { quoted: m })
                }

                rejectMarriage(userId)
                return await conn.sendMessage(m.chat, { 
                    text: `💔 Propuesta de @${pending.fromId} rechazada.` 
                }, { quoted: m })
            }

            // ─── PROPONER MATRIMONIO ───
            const targetMention = args[0].replace(/[@\s]/g, '')
            const targetId = targetMention.split('@')[0].replace(/\D/g, '')

            if (!targetId || targetId === userId) {
                return await conn.sendMessage(m.chat, { 
                    text: `❌ Menciona a alguien válido.` 
                }, { quoted: m })
            }

            const result = proposeMarriage(userId, targetId)
            if (!result.success) {
                return await conn.sendMessage(m.chat, { 
                    text: `❌ ${result.error}` 
                }, { quoted: m })
            }

            let txt = `💍 *PROPUESTA DE MATRIMONIO*\n\n`
            txt += `@${userId} te ha propuesto matrimonio.\n\n`
            txt += `¿Aceptas?\n`
            txt += `#marry accept - Aceptar\n`
            txt += `#marry reject - Rechazar\n\n`
            txt += `⏳ Expira en 5 minutos`
            await conn.sendMessage(m.chat, { 
                text: txt, 
                mentions: [targetId + '@s.whatsapp.net', userId + '@s.whatsapp.net'] 
            }, { quoted: m })
            return
        }

        // ─── DIVORCE / DIVORCIAR ───
        if (command === 'divorce' || command === 'divorciar') {
            const result = divorce(userId)
            if (!result.success) {
                return await conn.sendMessage(m.chat, { 
                    text: `❌ ${result.error}` 
                }, { quoted: m })
            }

            let txt = `💔 *DIVORCIO*\n\n`
            txt += `@${userId} y @${result.divorced} ya no están casados.\n\n`
            txt += `Los hijos permanecen en el árbol genealógico.`
            await conn.sendMessage(m.chat, { 
                text: txt, 
                mentions: [userId + '@s.whatsapp.net', result.divorced + '@s.whatsapp.net'] 
            }, { quoted: m })
            return
        }

    } catch (error) {
        console.error('Error en marry:', error)
        await conn.sendMessage(m.chat, { 
            text: `❌ Error: ${error.message}` 
        }, { quoted: m })
    }
}

handler.help = ['marry @usuario', 'marry accept', 'marry reject', 'divorce']
handler.tags = ['tools', 'family']
handler.command = ['marry', 'casar', 'divorce', 'divorciar']

export default handler
