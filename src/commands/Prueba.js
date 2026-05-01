import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn }) => {
    const start = Date.now()
    
    const isInstalled = !!conn.lid
    let sender = m.key.participant || m.key.remoteJid
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

    let text = `*🧪 DIAGNÓSTICO DE LIDSYNC*\n\n`
    
    text += `*🔧 ESTADO DEL SISTEMA*\n`
    text += `- Librería inyectada: ${isInstalled ? '✅ SÍ' : '❌ NO'}\n`
    text += `- Motor de búsqueda: ${isInstalled ? '✅ ACTIVO' : '❌ INACTIVO'}\n\n`

    text += `*👤 PRUEBA DE RESOLUCIÓN*\n`
    text += `- Remitente: ${sender}\n`
    text += `- Resultado: ${resuelto}\n`
    text += `- Estado: ${statusResolucion}\n\n`
    
    text += `*📊 ESTADÍSTICAS*\n`
    text += `- Identidades en memoria: ${cacheSize}\n`
    text += `- Efectividad: ${hitRate}\n\n`

    text += `*⚡ RENDIMIENTO*\n`
    text += `- Velocidad Bot: ${botPing}ms\n`
    text += `- Velocidad Server: ${serverPing}ms`

    await conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['testlid']
handler.tags = ['tools']
handler.command = ['ping2', 'testlid', 'p2']

export default handler
