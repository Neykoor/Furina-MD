function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Regex que detecta URLs reales (http/https/www o dominio.tld)
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiLinkDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false // Sin permisos de admin no podemos borrar

    const text = (
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption || ''
    ).trim()

    if (!text) return false

    // Reiniciar lastIndex (regex global reutilizado)
    LINK_REGEX.lastIndex = 0
    if (!LINK_REGEX.test(text)) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🔗 @${senderNum} enlaces no están permitidos en este grupo.`,
            mentions: [sender]
        })
        return true
    } catch {
        return false
    }
}
