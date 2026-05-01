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

const NSFW_WORDS = ['xxx', 'porn', 'porno', 'sex', 'sexo', 'nude', 'desnudo', 'hot', 'onlyfans', 'fansly', 'camgirl', 'webcam', 'escort']

export async function antiNsfwDetector(sock, m) {
    const groupJid = m.key?.remoteJid
    if (!groupJid || !groupJid.endsWith('@g.us')) return false
    if (m.key?.fromMe) return false
    if (!isEnabled(groupJid, 'antiNsfw')) return false

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || ''
    const lowerText = text.toLowerCase()
    const isNsfw = NSFW_WORDS.some(w => lowerText.includes(w))
    if (!isNsfw) return false

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
