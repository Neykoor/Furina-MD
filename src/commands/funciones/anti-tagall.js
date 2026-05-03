function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiTagAllDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (mentions.length <= 10) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🔔 @${senderNum} las menciones masivas no están permitidas.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
