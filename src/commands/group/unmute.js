let handler = async (m, { conn, isAdmin }) => {
    if (!m.isGroup) return
    if (!isAdmin) return

    let chat = global.db?.data?.chats?.[m.chat]
    if (chat) {
        chat.isBanned = false
    } else {
        if (!global.db) global.db = { data: { chats: {} } }
        if (!global.db.data.chats) global.db.data.chats = {}
        global.db.data.chats[m.chat] = { isBanned: false }
    }

    await conn.sendMessage(m.chat, { text: '🔊 Bot reactivado en este grupo. Los comandos funcionan nuevamente.' }, { quoted: m })
}

handler.help = ['unmute']
handler.tags = ['group']
handler.command = ['unmute', 'activar', 'encender']
handler.group = true
handler.admin = true

export default handler
