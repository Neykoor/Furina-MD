let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let title = args.join(' ')
    if (!title || title.length > 25) {
        await conn.sendMessage(m.chat, { text: '❌ Escribe un nombre válido (máx. 25 caracteres).' }, { quoted: m })
        return
    }

    try {
        await conn.groupUpdateSubject(m.chat, title)
        await conn.sendMessage(m.chat, { text: '✅ Nombre del grupo actualizado.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo cambiar el nombre.' }, { quoted: m })
    }
}

handler.help = ['setsubject']
handler.tags = ['group']
handler.command = ['setsubject', 'setname', 'nombregp', 'subject']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
