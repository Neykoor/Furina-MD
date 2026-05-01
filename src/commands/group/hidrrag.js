let handler = async (m, { conn, args, isAdmin }) => {
    if (!m.isGroup) return
    if (!isAdmin) return

    let groupMetadata = await conn.groupMetadata(m.chat)
    let participants = groupMetadata.participants
    let teks = args?.length ? args.join(' ') : '👥 *Mención oculta*'
    let mentions = participants.map(p => p.id)

    await conn.sendMessage(m.chat, { text: teks, mentions }, { quoted: m })
}

handler.help = ['hidetag']
handler.tags = ['group']
handler.command = ['hidetag', 'notificar', 'notify']
handler.group = true
handler.admin = true

export default handler
