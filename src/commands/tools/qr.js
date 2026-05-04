import QRCode from 'qrcode'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return conn.reply(m.chat, `📱 *Generador QR*\n\nUso: ${usedPrefix + command} <texto>\nEjemplo: ${usedPrefix + command} https://google.com`, m)
    }
    
    try {
        await m.react('🕒')
        const buffer = await QRCode.toBuffer(args.join(' '), { width: 512, margin: 2 })
        await conn.sendMessage(m.chat, { image: buffer, caption: '✅ *QR Generado*' }, { quoted: m })
        await m.react('✅')
    } catch (e) {
        conn.reply(m.chat, `❌ *Error:* ${e.message}`, m)
    }
}

handler.tags = ['tools']
handler.help = ['qr']
handler.command = ['qr2', 'qrcode']

export default handler
