let handler = async (m, { conn, isAdmin }) => {
    if (!m.isGroup) return
    if (!isAdmin) return

    let chat = global.db?.data?.chats?.[m.chat]
    if (chat) {
        chat.isBanned = true
    } else {
        if (!global.db) global.db = { data: { chats: {} } }
        if (!global.db.data.chats) global.db.data.chats = {}
        global.db.data.chats[m.chat] = { isBanned: true }
    }

    await conn.sendMessage(m.chat, { text: '🔇 Bot silenciado en este grupo. Los comandos ya no funcionarán aquí.' }, { quoted: m })
}

handler.help = ['mute']
handler.tags = ['group']
handler.command = ['mute', 'silenciar', 'apagar']
handler.group = true
handler.admin = true

export default handler
