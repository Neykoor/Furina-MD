import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'

const dbFile = path.join(process.cwd(), 'data', 'anti-config.json')
const warnedUsers = new NodeCache({ stdTTL: 300 })

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

const FAKE_PREFIXES = ['1', '44', '49', '33', '39', '34', '7', '81', '82', '86', '91', '92', '93', '94', '95']

function isFake(num) {
    return FAKE_PREFIXES.some(p => num.startsWith(p))
}

export async function antiFakeDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isEnabled(groupJid, 'antiFake')) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)
    if (!isFake(senderNum)) return false

    const key = `warn:${groupJid}:${senderNum}`
    let warns = warnedUsers.get(key) || 0
    warns++
    warnedUsers.set(key, warns)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🚫 @${senderNum} numero falso detectado. Advertencia ${warns}/3`,
            mentions: [sender]
        })
        if (warns >= 3) {
            warnedUsers.del(key)
            await sock.groupParticipantsUpdate(groupJid, [sender], 'remove')
            await sock.sendMessage(groupJid, {
                text: `👢 @${senderNum} expulsado por numero falso.`,
                mentions: [sender]
            })
        }
        return true
    } catch { return false }
}
