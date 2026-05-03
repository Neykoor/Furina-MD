function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

const BAD_WORDS = [
    'puto', 'puta', 'mierda', 'verga', 'pendejo', 'pendeja', 'chinga', 'chingar',
    'coño', 'joder', 'hostia', 'gilipollas', 'cabron', 'cabrona', 'maricon',
    'mamon', 'idiota', 'estupido', 'estupida', 'imbecil', 'tonto', 'tonta',
    'bastardo', 'zorra', 'perra', 'nazi', 'kkk', 'hitler', 'fuck', 'shit',
    'bitch', 'asshole', 'dick', 'cunt', 'nigger', 'faggot', 'retard'
]

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiBadWordsDetector(sock, m, isBotAdmin = false) {
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

    if (!BAD_WORDS.some(w => text.includes(w))) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🔞 @${senderNum} palabra prohibida detectada.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
