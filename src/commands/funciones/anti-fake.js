import NodeCache from 'node-cache'

const warnedUsers = new NodeCache({ stdTTL: 300 })

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Prefijos de países considerados "falsos" o fuera de LATAM
const FAKE_PREFIXES = [
    '1', '44', '49', '33', '39', '34', '7', '81', '82', '86', '91',
    '92', '93', '94', '95'
]

function isFake(num) {
    return FAKE_PREFIXES.some(p => num.startsWith(p))
}

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiFakeDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)
    if (!isFake(senderNum)) return false

    const key = `warn:fake:${groupJid}:${senderNum}`
    let warns = warnedUsers.get(key) || 0
    warns++
    warnedUsers.set(key, warns)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🚫 @${senderNum} número falso detectado. Advertencia ${warns}/3`,
            mentions: [sender]
        })
        if (warns >= 3) {
            warnedUsers.del(key)
            await sock.groupParticipantsUpdate(groupJid, [sender], 'remove')
            await sock.sendMessage(groupJid, {
                text: `👢 @${senderNum} expulsado por número falso.`,
                mentions: [sender]
            })
        }
        return true
    } catch { return false }
}
