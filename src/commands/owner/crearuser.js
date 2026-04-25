import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, args, command }) => {
    const isOwner = global.owner?.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    if (!isOwner) {
        return conn.sendMessage(m.chat, {
            text: '👑 Este comando es solo para *owners*.'
        }, { quoted: m })
    }

    if (command === 'crearuser') {
        const [username, numero, password, role = 'user'] = args

        if (!username || !numero || !password) {
            return conn.sendMessage(m.chat, {
                text: '❌ Uso: *#crearuser <user> <numero> <contraseña> [rol]*\n\n' +
                    'Ejemplo: #crearuser fernando 521234567890 miPass123 user'
            }, { quoted: m })
        }

        const cleanNum = String(numero).replace(/\D/g, '')
        const port = process.env.PORT || 24683
        const webUrl = global.publicURL || `http://localhost:${port}`

        // Obtener token de owner para autenticación
        const ownerToken = global.webAdminToken || generateOwnerToken()

        try {
            const res = await fetch(`${webUrl}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerToken}`
                },
                body: JSON.stringify({
                    username: cleanNum,
                    password,
                    role
                })
            })

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()

            await conn.sendMessage(m.chat, {
                text: data.success
                    ? `✅ *Usuario Web Creado*\n\n` +
                    `👤 Usuario: *${username}*\n` +
                    `📱 Número: *${cleanNum}*\n` +
                    `🔐 Rol: *${role}*\n` +
                    `🔑 Contraseña: ||${password}||\n\n` +
                    `🌐 Accede en: ${webUrl}/login`
                    : `❌ ${data.error || 'Error al crear usuario'}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Asta Bot - Admin',
                        body: 'Gestión de usuarios web',
                        thumbnailUrl: global.icono || global.logo,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        showAdAttribution: false,
                        sourceUrl: global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
                    }
                }
            }, { quoted: m })
        } catch (e) {
            console.error('Error creando usuario:', e)
            await conn.sendMessage(m.chat, {
                text: `❌ Error al crear usuario web.\n\nVerifica que:\n` +
                    `• La web esté activa (puerto ${port})\n` +
                    `• El servidor no tenga errores\n` +
                    `• Tengas permisos de owner\n\n` +
                    `Error: ${e.message}`,
                contextInfo: {
                    externalAdReply: {
                        title: '❌ Error Web',
                        body: 'No se pudo conectar al dashboard',
                        thumbnailUrl: global.icono || global.logo
                    }
                }
            }, { quoted: m })
        }
    }
}

function generateOwnerToken() {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
}

handler.help = ['crearuser']
handler.tags = ['web', 'owner']
handler.command = ['crearuser']
handler.owner = true

export default handler