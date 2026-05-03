let handler = async (m, { conn, args, isAdmin, isBotAdmin }) => {
    if (!m.isGroup) return
    if (!isBotAdmin) return
    if (!isAdmin) return

    let number = args[0]?.replace(/[^0-9]/g, '')
    if (!number) {
        await conn.sendMessage(m.chat, { text: '❌ Escribe el número del usuario a agregar.\nEjemplo: .add 521234567890' }, { quoted: m })
        return
    }

    let users = number + '@s.whatsapp.net'

    try {
        await conn.groupParticipantsUpdate(m.chat, [users], 'add')
        await conn.sendMessage(m.chat, { text: '✅ Usuario agregado al grupo.' }, { quoted: m })
    } catch (err) {
        await conn.sendMessage(m.chat, { text: '❌ No se pudo agregar al usuario. Puede que tenga la privacidad activada.' }, { quoted: m })
    }
}

handler.help = ['add']
handler.tags = ['group']
handler.command = ['add', 'agregar', 'invitar']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
