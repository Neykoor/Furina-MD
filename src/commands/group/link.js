let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    try {
        let code = await conn.groupInviteCode(m.chat)
        await conn.sendMessage(m.chat, { text: `🔗 *Enlace del grupo:*\n\nhttps://chat.whatsapp.com/${code}` }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo obtener el enlace.' }, { quoted: m })
    }
}

handler.help = ['link']
handler.tags = ['group']
handler.command = ['link', 'enlace', 'invitelink', 'linkgp']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
