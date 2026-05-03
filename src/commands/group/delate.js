let handler = async (m, { conn, isAdmin }) => {
    if (!m.isGroup) return
    if (!isAdmin) return

    let quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) {
        await conn.sendMessage(m.chat, { text: '❌ Responde al mensaje que deseas eliminar.' }, { quoted: m })
        return
    }

    let key = {
        remoteJid: m.chat,
        fromMe: true,
        id: m.message.extendedTextMessage.contextInfo.stanzaId,
        participant: m.message.extendedTextMessage.contextInfo.participant
    }

    try {
        await conn.sendMessage(m.chat, { delete: key })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo eliminar el mensaje.' }, { quoted: m })
    }
}

handler.help = ['delete']
handler.tags = ['group']
handler.command = ['delete', 'del', 'eliminar']
handler.group = true
handler.admin = true

export default handler
