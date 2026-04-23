import crypto from 'crypto'

let handler = async (m, { conn, args, command }) => {
    const isOwner = global.owner?.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    // ==========================================
    // #token — Disponible para todos
    // ==========================================
    if (command === 'token') {
        // Si es owner, puede elegir rol (user, admin, owner)
        // Si NO es owner, forzamos rol 'user'
        let role = args[0] || 'user'
        
        if (!isOwner) {
            role = 'user' // Forzar user para no-owners
        }

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

    // ==========================================
    // #createwebuser — Solo owners
    // ==========================================
    if (command === 'createwebuser') {
        if (!isOwner) {
            return conn.sendMessage(m.chat, {
                text: '❌ Este comando es exclusivo para owners.'
            }, { quoted: m })
        }

        const [username, password, role = 'user'] = args
        if (!username || !password) {
            return conn.sendMessage(m.chat, {
                text: '❌ Uso: #createwebuser <numero> <password> [rol]'
            }, { quoted: m })
        }

        try {
            const res = await fetch('http://localhost:' + (process.env.PORT || 24683) + '/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer OWNER_SECRET'
                },
                body: JSON.stringify({ 
                    username: username.replace(/\D/g, ''), 
                    password, 
                    role 
                })
            })
            const data = await res.json()
            await conn.sendMessage(m.chat, {
                text: data.success 
                    ? `✅ Usuario *${username}* creado con rol *${role}*` 
                    : `❌ ${data.error}`
            }, { quoted: m })
        } catch (e) {
            console.error('Error creando usuario:', e)
            await conn.sendMessage(m.chat, { 
                text: '❌ Error al crear el usuario web.' 
            }, { quoted: m })
        }
    }
}

handler.help = ['token', 'createwebuser']
handler.tags = ['web', 'owner']
handler.command = ['token', 'createwebuser']

export default handler
