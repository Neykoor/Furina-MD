let handler = async (m, { conn, args }) => {
    const text = args.join(' ') || 'Hola mundo'
    const rm = String.fromCharCode(8206).repeat(4001)
    conn.reply(m.chat, `${text}${rm}${text}`, m)
}

handler.tags = ['tools']
handler.help = ['readmore']
handler.command = ['readmore', 'rm', 'leermas']

export default handler
