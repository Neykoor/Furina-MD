import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn }) => {
    const start = Date.now()
    
    // ─── DETECTAR JIDS ───
    let sender = m.key.participant || m.key.remoteJid
    let chat = m.chat || m.key.remoteJid
    let isGroup = chat?.endsWith('@g.us')
    
    // Variables para debug
    let debugLog = []
    let botIsAdmin = false
    let botAdminMethod = 'Ninguno'

    // ─── MÉTODOS DE DETECCIÓN DE ADMIN (BOT) ───
    const botJid = conn.user?.id || conn.user?.jid || conn.user
    
    // Método 1: groupMetadata + participants (estándar Baileys)
    try {
        if (isGroup) {
            const metadata = await conn.groupMetadata(chat)
            const botParticipant = metadata.participants?.find(
                p => p.id === botJid || p.id?.replace(/:\d+@/, '@') === botJid?.replace(/:\d+@/, '@')
            )
            if (botParticipant) {
                const adminLevel = botParticipant.admin // null | 'admin' | 'superadmin'
                if (adminLevel === 'admin' || adminLevel === 'superadmin') {
                    botIsAdmin = true
                    botAdminMethod = 'M1-groupMetadata.participants.admin'
                    debugLog.push(`✅ M1 FUNCIONA: admin=${adminLevel}`)
                } else {
                    debugLog.push(`❌ M1: bot es participante pero admin=${adminLevel}`)
                }
            } else {
                debugLog.push(`❌ M1: bot no encontrado en participants`)
            }
        } else {
            debugLog.push(`➖ M1: No es grupo, skip`)
        }
    } catch (e) {
        debugLog.push(`❌ M1 ERROR: ${e.message}`)
    }

    // Método 2: conn.groupFetchAllParticipating (Baileys moderno)
    if (!botIsAdmin) try {
        if (isGroup && typeof conn.groupFetchAllParticipating === 'function') {
            const groups = await conn.groupFetchAllParticipating()
            const group = groups[chat]
            if (group) {
                const botP = group.participants?.find(
                    p => p.id === botJid || p.id?.replace(/:\d+@/, '@') === botJid?.replace(/:\d+@/, '@')
                )
                if (botP?.admin === 'admin' || botP?.admin === 'superadmin') {
                    botIsAdmin = true
                    botAdminMethod = 'M2-groupFetchAllParticipating'
                    debugLog.push(`✅ M2 FUNCIONA: admin=${botP.admin}`)
                } else {
                    debugLog.push(`❌ M2: bot encontrado pero admin=${botP?.admin}`)
                }
            } else {
                debugLog.push(`❌ M2: grupo no encontrado en cache`)
            }
        } else {
            debugLog.push(`➖ M2: No disponible o no es grupo`)
        }
    } catch (e) {
        debugLog.push(`❌ M2 ERROR: ${e.message}`)
    }

    // Método 3: conn.chats[chat].metadata (cache interno)
    if (!botIsAdmin) try {
        if (isGroup && conn.chats?.[chat]?.metadata) {
            const meta = conn.chats[chat].metadata
            const botP = meta.participants?.find(
                p => p.id === botJid || p.id?.replace(/:\d+@/, '@') === botJid?.replace(/:\d+@/, '@')
            )
            if (botP?.admin === 'admin' || botP?.admin === 'superadmin') {
                botIsAdmin = true
                botAdminMethod = 'M3-conn.chats.cache'
                debugLog.push(`✅ M3 FUNCIONA: admin=${botP.admin}`)
            } else {
                debugLog.push(`❌ M3: cache disponible pero admin=${botP?.admin}`)
            }
        } else {
            debugLog.push(`➖ M3: Sin cache para este grupo`)
        }
    } catch (e) {
        debugLog.push(`❌ M3 ERROR: ${e.message}`)
    }

    // Método 4: m.isBotAdmin (propiedad del mensaje, algunos plugins)
    if (!botIsAdmin) try {
        if (m.isBotAdmin !== undefined) {
            if (m.isBotAdmin === true) {
                botIsAdmin = true
                botAdminMethod = 'M4-m.isBotAdmin'
                debugLog.push(`✅ M4 FUNCIONA: isBotAdmin=true`)
            } else {
                debugLog.push(`❌ M4: m.isBotAdmin=${m.isBotAdmin}`)
            }
        } else {
            debugLog.push(`➖ M4: m.isBotAdmin no existe`)
        }
    } catch (e) {
        debugLog.push(`❌ M4 ERROR: ${e.message}`)
    }

    // Método 5: conn.user.jid directo comparando con participants raw
    if (!botIsAdmin) try {
        if (isGroup) {
            const metadata = await conn.groupMetadata(chat)
            // Buscar por número sin sufijo
            const botNumber = botJid?.split('@')[0]
            const botP = metadata.participants?.find(p => {
                const pNum = p.id?.split('@')[0]?.split(':')[0]
                return pNum === botNumber
            })
            if (botP?.admin === 'admin' || botP?.admin === 'superadmin') {
                botIsAdmin = true
                botAdminMethod = 'M5-matchPorNumero'
                debugLog.push(`✅ M5 FUNCIONA: admin=${botP.admin}`)
            } else {
                debugLog.push(`❌ M5: match por número falló, admin=${botP?.admin}`)
            }
        } else {
            debugLog.push(`➖ M5: No es grupo`)
        }
    } catch (e) {
        debugLog.push(`❌ M5 ERROR: ${e.message}`)
    }

    // ─── LIDSYNC (tu código original) ───
    const isInstalled = !!conn.lid
    let resuelto = 'Es número normal'
    let statusResolucion = '➖ No requiere resolución'

    if (isInstalled && sender.endsWith('@lid')) {
        const info = await conn.lid.resolve(sender)
        if (info) {
            resuelto = info
            statusResolucion = '✅ Resuelto con éxito'
        } else {
            resuelto = 'Desconocido'
            statusResolucion = '⚠️ Falta historial en Store'
        }
    }

    const stats = isInstalled && typeof conn.lid.getStats === 'function' ? conn.lid.getStats() : {}
    const cacheSize = stats.size ?? 0
    const hitRate = stats.hitRate ?? '0%'

    // ─── PING ───
    const end = Date.now()
    const botPing = end - start

    let serverPing = 0
    try {
        const { stdout } = await execAsync('ping -c 1 8.8.8.8')
        const match = stdout.match(/time=(\d+\.?\d*)/)
        if (match) serverPing = Math.round(parseFloat(match[1]))
    } catch {
        serverPing = 0
    }

    // ─── CONSTRUIR RESPUESTA ───
    let text = `*🧪 DIAGNÓSTICO COMPLETO*\n\n`
    
    text += `*🔧 ESTADO DEL SISTEMA*\n`
    text += `- Librería LID: ${isInstalled ? '✅ SÍ' : '❌ NO'}\n`
    text += `- Bot JID: ${botJid || 'No detectado'}\n`
    text += `- Chat: ${isGroup ? 'Grupo' : 'Privado'} ${chat}\n\n`

    text += `*👤 BOT ADMIN DETECCIÓN*\n`
    text += `- ¿Es Admin?: ${botIsAdmin ? '✅ SÍ' : '❌ NO'}\n`
    text += `- Método usado: ${botAdminMethod}\n\n`

    text += `*📊 LIDSYNC*\n`
    text += `- Remitente: ${sender}\n`
    text += `- Resultado: ${resuelto}\n`
    text += `- Estado: ${statusResolucion}\n`
    text += `- IDs en memoria: ${cacheSize}\n`
    text += `- Efectividad: ${hitRate}\n\n`

    text += `*⚡ RENDIMIENTO*\n`
    text += `- Velocidad Bot: ${botPing}ms\n`
    text += `- Velocidad Server: ${serverPing}ms`

    // ─── DEBUG EN CONSOLA ───
    console.log('═══════════════════════════════════════')
    console.log('🔍 DEBUG - DETECCIÓN DE ADMIN DEL BOT')
    console.log('═══════════════════════════════════════')
    console.log(`Bot JID: ${botJid}`)
    console.log(`Chat: ${chat}`)
    console.log(`Es grupo: ${isGroup}`)
    console.log(`Resultado final: ${botIsAdmin ? '✅ ADMIN' : '❌ NO ADMIN'}`)
    console.log(`Método ganador: ${botAdminMethod}`)
    console.log('--- Métodos probados ---')
    debugLog.forEach(log => console.log(log))
    console.log('═══════════════════════════════════════')

    await conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['testlid']
handler.tags = ['tools']
handler.command = ['ping3', 'testlid', 'p3']

export default handler
