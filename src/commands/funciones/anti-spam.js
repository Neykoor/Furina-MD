import NodeCache from 'node-cache'

// Cache: cada usuario tiene un conteo de mensajes que se resetea cada 60 segundos
const spamCache = new NodeCache({ stdTTL: 60 })

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// Límite: 5 mensajes en 60 segundos = spam
const SPAM_LIMIT = 5

// isBotAdmin es pasado desde anti-master.js (calculado en message-handler.js)
export async function antiSpamDetector(sock, m, isBotAdmin = false) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isBotAdmin) return false // Sin permisos de admin no podemos borrar

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)
    const key = `spam:${groupJid}:${senderNum}`

    let count = spamCache.get(key) || 0
    count++
    spamCache.set(key, count)

    if (count >= SPAM_LIMIT) {
        try {
            await sock.sendMessage(groupJid, { delete: m.key })
            await sock.sendMessage(groupJid, {
                text: `📵 @${senderNum} spam detectado. Por favor, no envíes tantos mensajes seguidos.`,
                mentions: [sender]
            })
            spamCache.del(key)
            return true
        } catch {
            return false
        }
    }
    return false
}
