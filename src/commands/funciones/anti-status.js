function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiStatusDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const msg = m.message || {}

    // Método 1: el mensaje cita un estado (contextInfo.remoteJid === 'status@broadcast')
    const contextRemoteJid = msg?.extendedTextMessage?.contextInfo?.remoteJid || ''
    const isStatusQuote = contextRemoteJid === 'status@broadcast'

    // Método 2: texto contiene mención explícita de estado
    const text = (
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        msg?.videoMessage?.caption || ''
    ).toLowerCase()
    const hasStatusText = /status@broadcast|@estado|estado@broadcast/.test(text)

    if (!isStatusQuote && !hasStatusText) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `📢 @${senderNum} las menciones de estados no están permitidas.`,
            mentions: [sender]
        })
        return true
    } catch {
        return false
    }
}
