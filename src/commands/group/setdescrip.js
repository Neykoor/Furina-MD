let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let desc = args.join(' ')
    if (!desc) {
        await conn.sendMessage(m.chat, { text: '❌ Escribe la nueva descripción del grupo.' }, { quoted: m })
        return
    }

    try {
        await conn.groupUpdateDescription(m.chat, desc)
        await conn.sendMessage(m.chat, { text: '✅ Descripción del grupo actualizada.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo cambiar la descripción.' }, { quoted: m })
    }
}

handler.help = ['setdesc']
handler.tags = ['group']
handler.command = ['setdesc', 'setdescription', 'descripcion', 'desc']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
