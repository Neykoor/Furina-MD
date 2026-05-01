import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'

const dbFile = path.join(process.cwd(), 'data', 'anti-config.json')
const spamCache = new NodeCache({ stdTTL: 60 })

function loadDb() {
    if (!fs.existsSync(dbFile)) return {}
    return JSON.parse(fs.readFileSync(dbFile, 'utf-8'))
}

function isEnabled(jid, key) {
    return loadDb()[jid]?.[key] === true
}

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

export async function antiSpamDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isEnabled(groupJid, 'antiSpam')) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)
    const key = `spam:${groupJid}:${senderNum}`

    let count = spamCache.get(key) || 0
    count++
    spamCache.set(key, count)

    if (count >= 5) {
        try {
            await sock.sendMessage(groupJid, { delete: m.key })
            await sock.sendMessage(groupJid, {
                text: `📵 @${senderNum} spam detectado.`,
                mentions: [sender]
            })
            spamCache.del(key)
            return true
        } catch { return false }
    }
    return false
}
