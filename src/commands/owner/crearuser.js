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

        try {
            const res = await fetch('http://localhost:' + (process.env.PORT || 24683) + '/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer OWNER_SECRET'
                },
                body: JSON.stringify({
                    username: cleanNum,
                    password,
                    role
                })
            })
            const data = await res.json()

            await conn.sendMessage(m.chat, {
                text: data.success
                    ? `✅ Usuario creado exitosamente\n\n` +
                    `👤 Usuario: *${username}*\n` +
                    `📱 Número: *${cleanNum}*\n` +
                    `🔐 Rol: *${role}*\n` +
                    `🔑 Contraseña: ||${password}||`
                    : `❌ ${data.error}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Asta Bot - Admin',
                        body: 'Gestión de usuarios',
                        thumbnailUrl: global.icono || global.logo
                    }
                }
            }, { quoted: m })
        } catch (e) {
            console.error('Error creando usuario:', e)
            await conn.sendMessage(m.chat, {
                text: '❌ Error al crear el usuario web.'
            }, { quoted: m })
        }
    }
}

handler.help = ['crearuser']
handler.tags = ['web', 'owner']
handler.command = ['crearuser']
handler.owner = true

export default handler
