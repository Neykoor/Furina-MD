let handler = async (m, { conn }) => {
  let target = m.sender

  if (m.message?.extendedTextMessage?.contextInfo?.participant) {
    target = m.message.extendedTextMessage.contextInfo.participant
  }

  try {
    const resolved = await conn.lid.resolve(target)

    let txt = `🔍 *Prueba LidSync v5*\n\n`
    txt += `*ID Original:* ${target}\n`
    txt += `*ID Resuelto:* ${resolved || 'No encontrado'}`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
  } catch (e) {
    await conn.sendMessage(m.chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
  }
}

handler.help = ['testlid']
handler.tags = ['info']
handler.command = ['testlid', 'verlid']

export default handler
