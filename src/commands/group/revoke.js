let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    try {
        await conn.groupRevokeInvite(m.chat)
        await conn.sendMessage(m.chat, { text: '✅ Enlace del grupo restablecido.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo restablecer el enlace.' }, { quoted: m })
    }
}

handler.help = ['revoke']
handler.tags = ['group']
handler.command = ['revoke', 'restablecer', 'resetlink', 'nuevoenlace']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
