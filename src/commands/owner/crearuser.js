/* ═══════════════════════════════════════════════════════════
   #crearuser — Crea un usuario en el panel web directamente
   Solo para owners (handler.owner = true)
   Uso: #crearuser <usuario> <numero> <contraseña> [rol]
   ═══════════════════════════════════════════════════════════ */

let handler = async (m, { conn, args, command }) => {

    // Validar argumentos
    const [username, numero, password, role = 'user'] = args

    if (!username || !numero || !password) {
        return conn.sendMessage(m.chat, {
            text:
                `❌ *Uso incorrecto*\n\n` +
                `*#crearuser <usuario> <numero> <contraseña> [rol]*\n\n` +
                `📌 *Ejemplos:*\n` +
                `• \`#crearuser fernando 521234567890 miPass123\`\n` +
                `• \`#crearuser admin 521234567890 pass123 admin\`\n\n` +
                `🔰 *Roles disponibles:*\n` +
                `• \`user\` — Usuario normal (predeterminado)\n` +
                `• \`admin\` — Administrador del panel\n\n` +
                `📋 *Notas:*\n` +
                `• El número debe incluir código de país (ej: 52 para México)\n` +
                `• La contraseña debe tener mínimo 6 caracteres\n` +
                `• El usuario podrá iniciar sesión en el panel web`
        }, { quoted: m })
    }

    // Limpiar número
    const cleanNum = String(numero).replace(/\D/g, '')

    // Validaciones básicas
    if (cleanNum.length < 10) {
        return conn.sendMessage(m.chat, {
            text: `❌ El número *${numero}* no es válido.\nDebe tener al menos 10 dígitos con código de país.\nEjemplo: *521234567890*`
        }, { quoted: m })
    }

    if (password.length < 6) {
        return conn.sendMessage(m.chat, {
            text: `❌ La contraseña debe tener *mínimo 6 caracteres*.\nRecibida: ${password.length} caracteres.`
        }, { quoted: m })
    }

    const validRoles = ['user', 'admin', 'owner']
    const finalRole  = validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'user'

    const port   = process.env.PORT || 24683
    const webUrl = global.publicURL || `http://localhost:${port}`

    // Logo para thumbnail
    let logoBuffer = global.botLogoCache || null
    if (!logoBuffer && global.icono) {
        try {
            const r = await fetch(global.icono)
            logoBuffer = Buffer.from(await r.arrayBuffer())
            global.botLogoCache = logoBuffer
        } catch { logoBuffer = null }
    }

    const contextOk = {
        externalAdReply: {
            title:                 `✅ ${global.namebot || 'Asta Bot'} – Usuario Creado`,
            body:                  `Panel Web · Rol: ${finalRole.toUpperCase()}`,
            thumbnail:             logoBuffer,
            mediaType:             1,
            renderLargerThumbnail: false,
            showAdAttribution:     false,
            sourceUrl:             `${webUrl}/login`
        }
    }

    const contextErr = {
        externalAdReply: {
            title:                 `❌ ${global.namebot || 'Asta Bot'} – Error`,
            body:                  'No se pudo crear el usuario',
            thumbnail:             logoBuffer,
            mediaType:             1,
            renderLargerThumbnail: false,
            showAdAttribution:     false,
            sourceUrl:             global.channel || webUrl
        }
    }

    // Obtener session token de admin para autenticar la petición
    // Usamos el secret del sistema para crear al usuario directamente
    try {
        // Paso 1: Obtener un token de acceso admin temporal
        const tokenRes = await fetch(`${webUrl}/api/tokens/create`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                secret: global.webSecret || 'asta-web-2024',
                owner:  m.sender,
                role:   'owner'
            }),
            signal: AbortSignal.timeout(8000)
        })

        if (!tokenRes.ok) throw new Error(`Token HTTP ${tokenRes.status}`)
        const tokenData = await tokenRes.json()
        if (!tokenData.success) throw new Error(tokenData.error)

        // Paso 2: Registrar al usuario con ese token
        const regRes = await fetch(`${webUrl}/api/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                username: cleanNum,
                password,
                token:    tokenData.token,
                role:     finalRole
            }),
            signal: AbortSignal.timeout(8000)
        })

        if (!regRes.ok) throw new Error(`Reg HTTP ${regRes.status}`)
        const regData = await regRes.json()

        if (regData.success) {
            // ✅ Éxito
            await conn.sendMessage(m.chat, {
                text:
                    `✅ *Usuario Web Creado Exitosamente*\n\n` +
                    `👤 *Nombre:* ${username}\n` +
                    `📱 *Usuario/Número:* \`${cleanNum}\`\n` +
                    `🔐 *Contraseña:* ||${password}||\n` +
                    `🔰 *Rol:* ${finalRole.toUpperCase()}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `🌐 *Cómo iniciar sesión:*\n` +
                    `1. Ve a: ${webUrl}/login\n` +
                    `2. Elige *"Usuario & Contraseña"*\n` +
                    `3. Usuario: \`${cleanNum}\`\n` +
                    `4. Contraseña: la que se creó\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `_El usuario ya puede acceder al panel web._`,
                contextInfo: contextOk
            }, { quoted: m })

        } else {
            // La API respondió con error
            const errMsg = regData.error || 'Error desconocido'
            let helpText = ''

            if (errMsg.includes('ya registrado') || errMsg.includes('ya existe')) {
                helpText = `\n\n💡 *Solución:* El número ${cleanNum} ya tiene cuenta.\nUsa otro número o elimina el usuario desde el panel web (/admin).`
            } else if (errMsg.includes('contraseña') || errMsg.includes('password')) {
                helpText = `\n\n💡 *Solución:* Usa una contraseña de al menos 6 caracteres.`
            } else if (errMsg.includes('usuario') || errMsg.includes('username')) {
                helpText = `\n\n💡 *Solución:* Verifica que el número sea válido.`
            }

            await conn.sendMessage(m.chat, {
                text: `❌ *No se pudo crear el usuario*\n\nMotivo: ${errMsg}${helpText}`,
                contextInfo: contextErr
            }, { quoted: m })
        }

    } catch (e) {
        console.error('[crearuser.js] Error:', e.message)

        // Si el servidor web no está disponible, crear el usuario directamente en memoria
        // para que cuando inicie la web, lo tenga disponible
        let fallbackMsg = ''
        try {
            const crypto = (await import('crypto')).default
            const hashPwd = p => crypto.createHash('sha256').update(p + 'asta-salt-2024').digest('hex')

            if (!global._pendingUsers) global._pendingUsers = new Map()
            global._pendingUsers.set(cleanNum, {
                username:  cleanNum,
                password:  hashPwd(password),
                role:      finalRole,
                money:     0,
                createdAt: new Date().toISOString(),
                createdBy: 'WhatsApp#crearuser',
                profile:   { phone: cleanNum, bio: '', avatar: '' }
            })
            fallbackMsg = `\n\n⚠️ _La web no estaba activa. El usuario se guardó localmente y estará disponible cuando la web inicie._`
        } catch { fallbackMsg = '' }

        await conn.sendMessage(m.chat, {
            text:
                `❌ *Error al conectar con el panel web*\n\n` +
                `Verifica que:\n` +
                `• La web esté activa (puerto ${port})\n` +
                `• No haya errores en el servidor\n\n` +
                `Error técnico: \`${e.message}\`` +
                fallbackMsg,
            contextInfo: contextErr
        }, { quoted: m })
    }
}

handler.help    = ['crearuser <usuario> <numero> <contraseña> [rol]']
handler.tags    = ['web', 'owner']
handler.command = ['crearuser', 'newuser', 'adduser']
handler.owner   = true   // ← Solo owners pueden usar este comando

export default handler
