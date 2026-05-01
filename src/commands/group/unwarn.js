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
        await conn.sendMessage(m.chat, { text: '❌ Menciona o responde al usuario.' }, { quoted: m })
        return
    }

    let warns = loadWarns()
    let gid = m.chat
    if (!warns[gid]?.[users] || warns[gid][users] <= 0) {
        await conn.sendMessage(m.chat, { text: 'ℹ️ Este usuario no tiene advertencias.' }, { quoted: m })
        return
    }

    warns[gid][users]--
    saveWarns(warns)

    await conn.sendMessage(m.chat, { text: `✅ Advertencia removida.\n\n@${users.split('@')[0]} ahora tiene ${warns[gid][users]}/3.`, mentions: [users] }, { quoted: m })
}

handler.help = ['unwarn']
handler.tags = ['group']
handler.command = ['unwarn', 'delwarn', 'quitarwarn']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
