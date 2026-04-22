import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let handler = async (m, { conn }) => {
    const start = Date.now()
    
    // 1. Intentar resolver el remitente para probar la librería
    let sender = m.key.participant || m.key.remoteJid
    let resuelto = 'No es un LID'
    
    if (sender.endsWith('@lid')) {
        const info = await conn.lid.resolve(sender)
        resuelto = info ? info : 'No se pudo resolver'
    }

    const end = Date.now()
    const botPing = end - start

    // 2. Obtener estadísticas del resolver
    const stats = conn.lid.getStats()

    let serverPing = 0
    try {
        const { stdout } = await execAsync('ping -c 1 8.8.8.8')
        const match = stdout.match(/time=(\d+\.?\d*)/)
        if (match) serverPing = Math.round(parseFloat(match[1]))
    } catch {
        serverPing = 0
    }

    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)

    let text = `*🧪 PRUEBA DE LIDSYNC*\n\n`
    text += `*ID Remitente:* ${sender}\n`
    text += `*Resolución:* ${resuelto}\n\n`
    
    text += `*📊 ESTADO LIBRERÍA*\n`
    text += `- Cache: ${stats.size} entradas\n`
    text += `- Tasa de acierto: ${stats.hitRate}\n\n`

    text += `*⚡ RENDIMIENTO*\n`
    text += `- Ping Bot: ${botPing}ms\n`
    text += `- Ping Servidor: ${serverPing}ms\n`
    text += `- Uptime: ${hours}h ${minutes}m`

    await conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['testlid']
handler.tags = ['tools']
handler.command = ['ping2', 'testlid', 'p2']

export default handler
