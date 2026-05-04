import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn }) => {
    const start = Date.now()
    
    // ─── JIDS BÁSICOS ───
    let sender = m.key.participant || m.key.remoteJid
    let chat = m.chat || m.key.remoteJid
    let isGroup = chat?.endsWith('@g.us')
    let botJid = conn.user?.id || conn.user?.jid || conn.user
    
    // ─── DETECCIÓN DE ADMIN DEL BOT (M4 - ÚNICO QUE FUNCIONA) ───
    let botIsAdmin = false
    let botAdminLevel = 'ninguno'

    if (m.isBotAdmin === true) {
        botIsAdmin = true
        botAdminLevel = 'admin/superadmin'
    }

    // ─── LIDSYNC (TU CÓDIGO ORIGINAL) ───
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

    // ─── RESPUESTA ───
    let text = `*🧪 DIAGNÓSTICO LIMPIO*\n\n`
    
    text += `*🔧 SISTEMA*\n`
    text += `- LIDSync: ${isInstalled ? '✅' : '❌'}\n`
    text += `- Bot JID: ${botJid || '?'}\n`
    text += `- Chat: ${isGroup ? 'Grupo' : 'Privado'}\n\n`

    text += `*👤 BOT ADMIN*\n`
    text += `- ¿Es Admin?: ${botIsAdmin ? '✅ SÍ' : '❌ NO'}\n`
    text += `- Nivel: ${botAdminLevel}\n\n`

    text += `*📊 LIDSYNC*\n`
    text += `- Remitente: ${sender}\n`
    text += `- Resultado: ${resuelto}\n`
    text += `- Estado: ${statusResolucion}\n`
    text += `- IDs en memoria: ${cacheSize}\n`
    text += `- Efectividad: ${hitRate}\n\n`

    text += `*⚡ RENDIMIENTO*\n`
    text += `- Bot: ${botPing}ms\n`
    text += `- Server: ${serverPing}ms`

    // ─── DEBUG MÍNIMO EN CONSOLA ───
    console.log(`✅ [Prueba.js] M4 FUNCIONA | botAdmin=${botIsAdmin} | chat=${chat}`)

    await conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['testlid']
handler.tags = ['tools']
handler.command = ['ping3', 'testlid', 'p3']

export default handler
