import { getOrCreateUser, formatMoney } from '../../../lib/users.js'
import { getFamilyData, proposeMarriage, acceptMarriage, divorce, getFamilyStats } from '../../../lib/family.js'

const pendingProposals = new Map()

let handler = async (m, { conn, args, command }) => {
    try {
        const userId = m.sender.split('@')[0].replace(/\D/g, '')
        const user = getOrCreateUser(userId)
        const family = getFamilyData(userId)

        if (command === 'marry' || command === 'casar') {
            if (!args[0]) {
                if (family.spouse) {
                    const spouse = getOrCreateUser(family.spouse)
                    const since = family.spouseSince ? new Date(family.spouseSince).toLocaleDateString() : 'Desconocido'
                    let txt = `💑 *ESTADO MATRIMONIAL*\n\n`
                    txt += `Casado con: @${family.spouse}\n`
                    txt += `Desde: ${since}\n`
                    txt += `Hijos: ${family.children.length}\n\n`
                    txt += `Usa *#divorce* para divorciarte`
                    return await conn.sendMessage(m.chat, { text: txt, mentions: [family.spouse + '@s.whatsapp.net'] }, { quoted: m })
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

            if (args[0] === 'accept' || args[0] === 'aceptar') {
                const pending = pendingProposals.get(userId)
                if (!pending) {
                    return await conn.sendMessage(m.chat, { text: `❌ No tienes propuestas pendientes.` }, { quoted: m })
                }

                const result = acceptMarriage(userId, pending)
                pendingProposals.delete(userId)

                let txt = `💍 *¡MATRIMONIO CELEBRADO!*\n\n`
                txt += `@${userId} + @${pending} = 💑\n\n`
                txt += `¡Que vivan los novios!`
                await conn.sendMessage(m.chat, { text: txt, mentions: [userId + '@s.whatsapp.net', pending + '@s.whatsapp.net'] }, { quoted: m })
                return
            }

            if (args[0] === 'reject' || args[0] === 'rechazar') {
                const pending = pendingProposals.get(userId)
                if (!pending) {
                    return await conn.sendMessage(m.chat, { text: `❌ No tienes propuestas pendientes.` }, { quoted: m })
                }

                pendingProposals.delete(userId)
                return await conn.sendMessage(m.chat, { text: `💔 Propuesta rechazada.` }, { quoted: m })
            }

            const targetMention = args[0].replace(/[@\s]/g, '')
            const targetId = targetMention.split('@')[0].replace(/\D/g, '')

            if (!targetId || targetId === userId) {
                return await conn.sendMessage(m.chat, { text: `❌ Menciona a alguien válido.` }, { quoted: m })
            }

            const result = proposeMarriage(userId, targetId)
            if (!result.success) {
                return await conn.sendMessage(m.chat, { text: `❌ ${result.error}` }, { quoted: m })
            }

            pendingProposals.set(targetId, userId)

            let txt = `💍 *PROPUESTA DE MATRIMONIO*\n\n`
            txt += `@${userId} te ha propuesto matrimonio.\n\n`
            txt += `¿Aceptas?\n`
            txt += `#marry accept - Aceptar\n`
            txt += `#marry reject - Rechazar`
            await conn.sendMessage(m.chat, { text: txt, mentions: [targetId + '@s.whatsapp.net', userId + '@s.whatsapp.net'] }, { quoted: m })
            return
        }

        if (command === 'divorce' || command === 'divorciar') {
            const result = divorce(userId)
            if (!result.success) {
                return await conn.sendMessage(m.chat, { text: `❌ ${result.error}` }, { quoted: m })
            }

            let txt = `💔 *DIVORCIO*\n\n`
            txt += `@${userId} y @${result.divorced} ya no están casados.\n\n`
            txt += `Los hijos permanecen en el árbol genealógico.`
            await conn.sendMessage(m.chat, { text: txt, mentions: [userId + '@s.whatsapp.net', result.divorced + '@s.whatsapp.net'] }, { quoted: m })
            return
        }

    } catch (error) {
        console.error('Error en marry:', error)
        await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
    }
}

handler.help = ['marry @usuario', 'marry accept', 'divorce']
handler.tags = ['tools', 'family']
handler.command = ['marry', 'casar', 'divorce', 'divorciar']

export default handler
