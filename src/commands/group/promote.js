let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let users = m.mentionedJid?.[0]
        || (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0])
        || (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

    if (!users) {
        await conn.sendMessage(m.chat, { text: '❌ Menciona o responde al usuario que deseas ascender.' }, { quoted: m })
        return
    }

    try {
        await conn.groupParticipantsUpdate(m.chat, [users], 'promote')
        await conn.sendMessage(m.chat, { text: '✅ Usuario ascendido a administrador.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo ascender al usuario.' }, { quoted: m })
    }
}

handler.help = ['promote']
handler.tags = ['group']
handler.command = ['promote', 'promover', 'daradmin', 'addadmin']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
