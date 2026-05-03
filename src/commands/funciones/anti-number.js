function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Detecta números de teléfono en el texto (10 a 15 dígitos seguidos)
const PHONE_REGEX = /\b\d{10,15}\b/

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiNumberDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const text = (
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption || ''
    )

    if (!PHONE_REGEX.test(text)) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🔢 @${senderNum} números de teléfono no están permitidos.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
