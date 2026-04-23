import crypto from 'crypto'

let handler = async (m, { conn, args, command }) => {
    const isOwner = global.owner?.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    if (command === 'token') {
        let role = args[0] || 'user'
        if (!isOwner) role = 'user'

        const token = crypto.randomBytes(32).toString('hex')

        try {
            const res = await fetch('http://localhost:' + (process.env.PORT || 24683) + '/api/tokens/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: 'asta-web-2024',
                    owner: m.sender,
                    role: role
                })
            })
            const data = await res.json()

            if (data.success) {
                await conn.sendMessage(m.chat, {
                    text: `🔑 *Token de Registro Web*\n\n` +
                        `Token: \`${data.token}\`\n\n` +
                        `Rol: *${role.toUpperCase()}*\n` +
                        `Vinculado a: ${m.sender.split('@')[0]}\n` +
                        `Expira: 24 horas\n\n` +
                        `Usa este token en: ${global.publicURL || 'la web'}\n\n` +
                        `⚠️ No compartas este token`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Asta Bot - Web Dashboard',
                            body: 'Registro de usuario web',
                            thumbnailUrl: global.icono || global.logo
                        }
                    }
                }, { quoted: m })
            }
        } catch (e) {
            console.error('Error generando token:', e)
            await conn.sendMessage(m.chat, {
                text: '❌ Error generando token. ¿La web está activa?'
            }, { quoted: m })
        }
    }
}

handler.help = ['token']
handler.tags = ['web']
handler.command = ['token']

export default handler