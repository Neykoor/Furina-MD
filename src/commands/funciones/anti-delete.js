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

export async function antiDeleteDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (!isEnabled(groupJid, 'antiDelete')) return false

    const msg = m.message
    if (!msg?.protocolMessage || msg.protocolMessage.type !== 0) return false

    const deletedKey = msg.protocolMessage.key
    const senderJid = deletedKey?.participant || deletedKey?.remoteJid
    const num = cleanNum(senderJid)

    try {
        await sock.sendMessage(groupJid, {
            text: `🗑️ @${num} intento eliminar un mensaje.`,
            mentions: [senderJid]
        })
        return true
    } catch { return false }
}
