import fs from 'fs'
import path from 'path'

let warnsFile = path.join(process.cwd(), 'data', 'warns.json')

function loadWarns() {
    if (!fs.existsSync(warnsFile)) return {}
    return JSON.parse(fs.readFileSync(warnsFile, 'utf-8'))
}

function saveWarns(data) {
    fs.mkdirSync(path.dirname(warnsFile), { recursive: true })
    fs.writeFileSync(warnsFile, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let users = m.mentionedJid?.[0]
        || (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0])
        || (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

    if (!users) {
        await conn.sendMessage(m.chat, { text: '❌ Menciona o responde al usuario a advertir.' }, { quoted: m })
        return
    }

    let warns = loadWarns()
    let gid = m.chat
    if (!warns[gid]) warns[gid] = {}
    if (!warns[gid][users]) warns[gid][users] = 0

    warns[gid][users]++
    saveWarns(warns)

    let count = warns[gid][users]
    let text = `⚠️ @${users.split('@')[0]} ha sido advertido.\n\nAdvertencias: ${count}/3`

    await conn.sendMessage(m.chat, { text, mentions: [users] }, { quoted: m })

    if (count >= 3) {
        try {
            await conn.groupParticipantsUpdate(m.chat, [users], 'remove')
            await conn.sendMessage(m.chat, { text: `🚫 @${users.split('@')[0]} fue expulsado por acumular 3 advertencias.`, mentions: [users] })
            warns[gid][users] = 0
            saveWarns(warns)
        } catch { }
    }
}

handler.help = ['warn']
handler.tags = ['group']
handler.command = ['warn', 'advertir', 'advertencia']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
