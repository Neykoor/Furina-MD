import crypto from 'crypto'

let handler = async (m, { conn, args, command }) => {
    const isOwner = global.owner?.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    if (command === 'token') {
        let role = args[0] || 'user'
        if (!isOwner) role = 'user'

        const port = process.env.PORT || 24683
        const webUrl = global.publicURL || `http://localhost:${port}`

        try {
            // Generar token corto ASTA-XXXXX
            const shortToken = generateShortToken()

            const res = await fetch(`${webUrl}/api/tokens/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: global.webSecret || 'asta-web-2024',
                    owner: m.sender,
                    role: role,
                    token: shortToken
                })
            })

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()

            if (data.success) {
                await conn.sendMessage(m.chat, {
                    text: `🔑 *Token de Registro Web*\n\n` +
                        `Token: \`${data.token || shortToken}\`\n\n` +
                        `Rol: *${role.toUpperCase()}*\n` +
                        `Vinculado a: ${m.sender.split('@')[0]}\n` +
                        `Expira: 24 horas\n\n` +
                        `🔗 Usa este token en: ${webUrl}/login\n\n` +
                        `⚠️ *No compartas este token*`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Asta Bot - Web Dashboard',
                            body: 'Registro de usuario web',
                            thumbnailUrl: global.icono || global.logo,
                            mediaType: 1,
                            renderLargerThumbnail: false,
                            showAdAttribution: false,
                            sourceUrl: global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
                        }
                    }
                }, { quoted: m })
            } else {
                throw new Error(data.error || 'Error generando token')
            }
        } catch (e) {
            console.error('Error generando token:', e)
            await conn.sendMessage(m.chat, {
                text: `❌ Error generando token.\n\n` +
                    `Verifica que:\n` +
                    `• La web esté activa (puerto ${port})\n` +
                    `• El servidor no tenga errores\n\n` +
                    `Error: ${e.message}`,
                contextInfo: {
                    externalAdReply: {
                        title: '❌ Error Web',
                        body: 'No se pudo generar el token',
                        thumbnailUrl: global.icono || global.logo
                    }
                }
            }, { quoted: m })
        }
    }
}

function generateShortToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `ASTA-${code}`
}

handler.help = ['token']
handler.tags = ['web']
handler.command = ['token']

export default handler