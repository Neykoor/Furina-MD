function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

const NSFW_WORDS = [
    'xxx', 'porn', 'porno', 'sex', 'sexo', 'nude', 'desnudo',
    'onlyfans', 'fansly', 'camgirl', 'webcam', 'escort'
]

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiNsfwDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const text = (
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption || ''
    ).toLowerCase()

    if (!NSFW_WORDS.some(w => text.includes(w))) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🔞 @${senderNum} contenido NSFW detectado.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
