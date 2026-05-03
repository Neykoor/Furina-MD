let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let isClose = args[0] === 'close' || args[0] === 'cerrar'
    let isOpen = args[0] === 'open' || args[0] === 'abrir'

    if (!isClose && !isOpen) {
        await conn.sendMessage(m.chat, { text: '❌ Usa: .group open / .group close' }, { quoted: m })
        return
    }

    try {
        await conn.groupSettingUpdate(m.chat, isClose ? 'announcement' : 'not_announcement')
        await conn.sendMessage(m.chat, { text: isClose ? '🔒 Grupo cerrado.' : '🔓 Grupo abierto.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo cambiar la configuración del grupo.' }, { quoted: m })
    }
}

handler.help = ['group']
handler.tags = ['group']
handler.command = ['group', 'grupo']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
