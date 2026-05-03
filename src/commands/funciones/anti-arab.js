import NodeCache from 'node-cache'

const warnedUsers = new NodeCache({ stdTTL: 300 })

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Prefijos de países árabes y del norte de África
const ARAB_PREFIXES = [
    '212', '213', '216', '218', '220', '222', '249', '251', '252',
    '253', '254', '255', '256', '257', '258', '260', '263',
    '964', '965', '966', '967', '968', '970', '971', '972', '973',
    '974', '975', '976', '977', '992', '993', '994', '995', '996', '998'
]

function isArab(num) {
    return ARAB_PREFIXES.some(p => num.startsWith(p))
}

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiArabDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)
    if (!isArab(senderNum)) return false

    const key = `warn:arab:${groupJid}:${senderNum}`
    let warns = warnedUsers.get(key) || 0
    warns++
    warnedUsers.set(key, warns)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🇸🇦 @${senderNum} número árabe detectado. Advertencia ${warns}/3`,
            mentions: [sender]
        })
        if (warns >= 3) {
            warnedUsers.del(key)
            await sock.groupParticipantsUpdate(groupJid, [sender], 'remove')
            await sock.sendMessage(groupJid, {
                text: `👢 @${senderNum} expulsado por número árabe.`,
                mentions: [sender]
            })
        }
        return true
    } catch { return false }
}
