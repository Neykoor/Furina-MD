import fs from 'fs'
import path from 'path'

const dbFile = path.join(process.cwd(), 'data', 'anti-config.json')

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

export async function antiBotDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isEnabled(groupJid, 'antiBot')) return false

    const msgId = m.key?.id || ''
    if (msgId.length <= 20) return false

    const botIndicators = ['BAE', 'B24', '3EB', 'WA']
    if (!botIndicators.some(ind => msgId.startsWith(ind))) return false

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
