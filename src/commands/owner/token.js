import crypto from 'crypto'

/* ═══════════════════════════════════════════════════════════
   #token — Genera un token ASTA-XXXXX para registrarse en la web
   Uso: #token [rol]
   Roles disponibles (solo owners): user | admin
   ═══════════════════════════════════════════════════════════ */

function generateShortToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `ASTA-${code}`
}

let handler = async (m, { conn, args, isOwner }) => {
    // Si no es owner solo puede pedir rol "user"
    let role = 'user'
    if (isOwner && args[0]) {
        const validRoles = ['user', 'admin']
        role = validRoles.includes(args[0].toLowerCase()) ? args[0].toLowerCase() : 'user'
    }

    const port   = process.env.PORT || 24683
    const webUrl = global.publicURL || `http://localhost:${port}`

    // Logo para el thumbnail
    let logoBuffer = global.botLogoCache || null
    if (!logoBuffer && global.icono) {
        try {
            const r = await fetch(global.icono)
            logoBuffer = Buffer.from(await r.arrayBuffer())
            global.botLogoCache = logoBuffer
        } catch { logoBuffer = null }
    }

    const contextInfo = {
        externalAdReply: {
            title:                 `${global.namebot || 'Asta Bot'} – Web Dashboard`,
            body:                  'Registro de usuario web',
            thumbnail:             logoBuffer,
            mediaType:             1,
            renderLargerThumbnail: false,
            showAdAttribution:     false,
            sourceUrl:             global.channel || webUrl
        }
    }

    try {
        // Llamamos al endpoint /api/tokens/create del servidor web
        const res = await fetch(`${webUrl}/api/tokens/create`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                secret: global.webSecret || 'asta-web-2024',
                owner:  m.sender,
                role
            }),
            signal: AbortSignal.timeout(8000)
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        if (!data.success) throw new Error(data.error || 'Error desconocido')

        const token = data.token

        await conn.sendMessage(m.chat, {
            text:
                `🔑 *Token de Registro Web*\n\n` +
                `┌─────────────────────┐\n` +
                `│  \`${token}\`  │\n` +
                `└─────────────────────┘\n\n` +
                `🔰 Rol: *${role.toUpperCase()}*\n` +
                `📱 Para: ${m.sender.split('@')[0]}\n` +
                `⏳ Expira en: *24 horas*\n` +
                `🔂 Uso: *una sola vez*\n\n` +
                `🌐 Úsalo en:\n${webUrl}/login\n\n` +
                `_Escribe el token en el campo de registro y sigue las instrucciones._\n\n` +
                `⚠️ *No compartas este token con nadie.*`,
            contextInfo
        }, { quoted: m })

    } catch (e) {
        console.error('[token.js] Error:', e.message)

        // Si el servidor web no está disponible, generar token localmente
        // y guardarlo en global para que la web lo reconozca al iniciar
        const fallbackToken = generateShortToken()
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000

        if (!global._pendingTokens) global._pendingTokens = new Map()
        global._pendingTokens.set(fallbackToken, {
            token:     fallbackToken,
            owner:     m.sender,
            role,
            used:      false,
            createdAt: Date.now(),
            expiresAt
        })

        await conn.sendMessage(m.chat, {
            text:
                `🔑 *Token de Registro Web*\n\n` +
                `┌─────────────────────┐\n` +
                `│  \`${fallbackToken}\`  │\n` +
                `└─────────────────────┘\n\n` +
                `🔰 Rol: *${role.toUpperCase()}*\n` +
                `📱 Para: ${m.sender.split('@')[0]}\n` +
                `⏳ Expira en: *24 horas*\n` +
                `🔂 Uso: *una sola vez*\n\n` +
                `🌐 Úsalo en:\n${webUrl}/login\n\n` +
                `⚠️ *No compartas este token con nadie.*`,
            contextInfo
        }, { quoted: m })
    }
}

handler.help    = ['token [rol]']
handler.tags    = ['web']
handler.command = ['token', 'webtoken', 'registrarse']
// Sin handler.owner = true → cualquier usuario puede pedir su propio token de rol "user"
// Los owners además pueden pedir rol "admin"

export default handler
