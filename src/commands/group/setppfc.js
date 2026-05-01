let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let quoted = m.message?.imageMessage || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
    if (!quoted) {
        await conn.sendMessage(m.chat, { text: '❌ Responde a una imagen para establecerla como foto del grupo.' }, { quoted: m })
        return
    }

    try {
        let media = await conn.downloadMediaMessage(quoted)
        await conn.updateProfilePicture(m.chat, media)
        await conn.sendMessage(m.chat, { text: '✅ Foto del grupo actualizada.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo cambiar la foto del grupo.' }, { quoted: m })
    }
}

handler.help = ['setppgc']
handler.tags = ['group']
handler.command = ['setppgc', 'setgroupicon', 'fotogp', 'iconogp']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
