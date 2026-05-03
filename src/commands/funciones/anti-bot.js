function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// IDs de mensajes generados por bots de Baileys/WhatsApp suelen empezar con estos prefijos
const BOT_INDICATORS = ['BAE', 'B24', '3EB', 'WA']

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiBotDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const msgId = m.key?.id || ''
    if (msgId.length <= 20) return false
    if (!BOT_INDICATORS.some(ind => msgId.startsWith(ind))) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🤖 @${senderNum} mensaje de bot detectado.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
