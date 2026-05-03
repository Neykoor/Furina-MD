let handler = async (m, { conn, isAdmin }) => {
    if (!m.isGroup) return
    if (!isAdmin) return

    let groupMetadata = await conn.groupMetadata(m.chat)
    let participants = groupMetadata.participants
    let teks = args?.length ? args.join(' ') : '👥 *Mención general*'
    let mentions = participants.map(p => p.id)

    let text = `${teks}\n\n`
    for (let mem of participants) {
        text += `➤ @${mem.id.split('@')[0]}\n`
    }

    await conn.sendMessage(m.chat, { text, mentions }, { quoted: m })
}

handler.help = ['tagall']
handler.tags = ['group']
handler.command = ['tagall', 'todos', 'all']
handler.group = true
handler.admin = true

export default handler
