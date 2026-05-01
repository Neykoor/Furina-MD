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

export async function antiVoiceDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isEnabled(groupJid, 'antiVoice')) return false

    const msg = m.message || {}
    const tipo = Object.keys(msg)[0]
    if (tipo !== 'audioMessage' || !msg.audioMessage?.ptt) return false

    const sender = m.key?.participant || m.key?.remoteJid
    const senderNum = cleanNum(sender)

    try {
        await sock.sendMessage(groupJid, { delete: m.key })
        await sock.sendMessage(groupJid, {
            text: `🎙️ @${senderNum} notas de voz no permitidas.`,
            mentions: [sender]
        })
        return true
    } catch { return false }
}
