let handler = async (m, { conn }) => {
  const start = Date.now()
  await conn.sendMessage(m.chat, { text: '🏓 Pong!' })
  const end = Date.now()
  await conn.sendMessage(m.chat, { text: `⏱️ *Latencia:* ${end - start}ms` })
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping']

export default handler
