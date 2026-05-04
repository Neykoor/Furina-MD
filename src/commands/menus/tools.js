let handler = async (m, { conn, usedPrefix }) => {
    const user = global.db.data.users[m.sender] || {}
    const name = await conn.getName(m.sender).catch(() => 'Usuario')

    const text = `
╭─「 *🔧 ʜᴇʀʀᴀᴍɪᴇɴᴛᴀs* 」
│
│  *ᴜsᴜᴀʀɪᴏ:* ${name}
│  *ʟᴇᴠᴇʟ:* ${user.level || 1}
│  *ʀᴏʟ:* ${user.role || 'Novato'}
│
├─「 *🎨 sᴛɪᴄᴋᴇʀs* 」
│
│  *${usedPrefix}s* / *sticker* / *stiker*
│  └─ Crea sticker de imagen/video
│
│  *${usedPrefix}img* / *toimg*
│  └─ Sticker a imagen PNG
│
│  *${usedPrefix}brat* <texto>
│  └─ Texto a sticker brat
│
│  *${usedPrefix}bratv* <texto>
│  └─ Texto a sticker animado
│
│  *${usedPrefix}wtp* <texto>
│  └─ Conversacion iPhone a sticker
│
│  *${usedPrefix}emojimix* <e1+e2>
│  └─ Combina 2 emojis
│
│  *${usedPrefix}qc* <texto>
│  └─ Quote sticker (max 30 chars)
│
│  *${usedPrefix}take* / *wm*
│  └─ Cambia pack/autor sticker
│
│  *${usedPrefix}setpack* <p|a>
│  └─ Pack personalizado
│
│  *${usedPrefix}delpack*
│  └─ Restaurar pack default
│
├─「 *⚙️ ɢᴇɴᴇʀᴀʟ* 」
│
│  *${usedPrefix}ping*
│  └─ Velocidad del bot
│
│  *${usedPrefix}calc* <op>
│  └─ Calculadora
│
│  *${usedPrefix}qr* <texto>
│  └─ Genera codigo QR
│
│  *${usedPrefix}short* <url>
│  └─ Acortar URL
│
│  *${usedPrefix}readmore* <txt>
│  └─ Texto con readmore
│
╰─「 *ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ* ⚡ 」

> _Escribe ${usedPrefix}<comando> para usar_
`.trim()

    await conn.sendMessage(m.chat, {
        text,
        contextInfo: {
            externalAdReply: {
                title: '🔧 ᴍᴇɴᴜ ᴅᴇ ʜᴇʀʀᴀᴍɪᴇɴᴛᴀs',
                body: 'ᴀsᴛᴀ-ʙᴏᴛ-ᴍᴅ',
                thumbnailUrl: global.icono || 'https://telegra.ph/file/24fa902ead26340f3df2c.png',
                sourceUrl: global.redes,
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m })
}

handler.tags = ['main']
handler.help = ['tools', 'menu2', 'herramientas']
handler.command = ['tools', 'menu2', 'herramientas', 'tool']

export default handler
