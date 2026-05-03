import {
    sendCopyButton,
    sendUrlButton,
    sendQuickReplyButtons,
    sendCallButton,
    sendListMenu,
    sendInteractiveMessage
} from '@whiskeysockets/baileys'

/**
 * Envía un botón de copiar texto al portapapeles
 * @param {Object} conn - Conexión de WhatsApp (sock)
 * @param {String} chatId - JID del chat
 * @param {String} text - Texto del mensaje
 * @param {String} copyText - Texto a copiar
 * @param {String} buttonText - Texto del botón (default: '📋 Copiar')
 * @param {Object} options - Opciones adicionales (quoted, etc.)
 */

export async function botonCopiar(conn, chatId, text, copyText, buttonText = '📋 Copiar', options = {}) {
    try {
        await sendCopyButton(conn, chatId, text, copyText, buttonText)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en botonCopiar:', error.message)
        // Fallback: enviar como texto normal
        try {
            await conn.sendMessage(chatId, { text: `${text}\n\n\`\`\`${copyText}\`\`\`` }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía un botón con enlace URL
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} text - Texto del mensaje
 * @param {String} url - URL a abrir
 * @param {String} buttonText - Texto del botón
 * @param {Object} options - Opciones adicionales
 */
export async function botonUrl(conn, chatId, text, url, buttonText = '🔗 Abrir Enlace', options = {}) {
    try {
        await sendUrlButton(conn, chatId, text, url, buttonText)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en botonUrl:', error.message)
        try {
            await conn.sendMessage(chatId, {
                text: `${text}\n\n🔗 ${url}`,
                contextInfo: {
                    externalAdReply: {
                        title: buttonText,
                        sourceUrl: url
                    }
                }
            }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía botones de respuesta rápida
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} text - Texto del mensaje
 * @param {Array} buttons - Array de botones [{ id, text }]
 * @param {Object} options - Opciones adicionales
 */
export async function botonesRapidos(conn, chatId, text, buttons = [], options = {}) {
    try {
        // Validar formato de botones
        const validButtons = buttons.filter(b => b.id && b.text).map(b => ({
            id: String(b.id),
            text: String(b.text)
        }))

        if (validButtons.length === 0) {
            throw new Error('Se requiere al menos un botón válido con id y text')
        }

        await sendQuickReplyButtons(conn, chatId, text, validButtons)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en botonesRapidos:', error.message)
        // Fallback: enviar como lista numerada
        try {
            const lista = buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n')
            await conn.sendMessage(chatId, { text: `${text}\n\n${lista}` }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía un botón de llamada
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} text - Texto del mensaje
 * @param {String} phoneNumber - Número de teléfono (con código de país)
 * @param {String} buttonText - Texto del botón
 * @param {Object} options - Opciones adicionales
 */
export async function botonLlamada(conn, chatId, text, phoneNumber, buttonText = '📞 Llamar', options = {}) {
    try {
        // Limpiar número
        const cleanPhone = String(phoneNumber).replace(/\D/g, '')
        if (cleanPhone.length < 10) {
            throw new Error('Número de teléfono inválido')
        }

        await sendCallButton(conn, chatId, text, cleanPhone, buttonText)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en botonLlamada:', error.message)
        try {
            await conn.sendMessage(chatId, {
                text: `${text}\n\n📞 ${phoneNumber}`,
                contextInfo: {
                    externalAdReply: {
                        title: buttonText,
                        sourceUrl: `https://wa.me/${cleanPhone}`
                    }
                }
            }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía un menú de lista desplegable
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} title - Título de la lista
 * @param {String} description - Descripción de la lista
 * @param {Array} sections - Secciones con rows [{ title, rows: [{ id, title, description }] }]
 * @param {Object} options - Opciones adicionales
 */
export async function menuLista(conn, chatId, title, description, sections = [], options = {}) {
    try {
        // Validar y formatear secciones
        const validSections = sections.map((section, idx) => ({
            title: section.title || `Sección ${idx + 1}`,
            rows: (section.rows || []).filter(r => r.id && r.title).map(r => ({
                id: String(r.id),
                title: String(r.title),
                description: r.description || ''
            }))
        })).filter(s => s.rows.length > 0)

        if (validSections.length === 0) {
            throw new Error('Se requiere al menos una sección con filas válidas')
        }

        await sendListMenu(conn, chatId, title, description, validSections)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en menuLista:', error.message)
        // Fallback: enviar como texto formateado
        try {
            let texto = `*${title}*\n\n${description}\n`
            validSections.forEach(section => {
                texto += `\n📂 *${section.title}*\n`
                section.rows.forEach(row => {
                    texto += `  └ ${row.id} - ${row.title}\n`
                })
            })
            await conn.sendMessage(chatId, { text: texto.trim() }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía un mensaje interactivo con múltiples tipos de botones
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} text - Texto del mensaje
 * @param {Array} buttons - Array de botones [{ type, text, value }]
 * @param {Object} options - Opciones adicionales
 */
export async function mensajeInteractivo(conn, chatId, text, buttons = [], options = {}) {
    try {
        // Validar y formatear botones
        const validButtons = buttons.filter(b => {
            if (!b.type || !b.text) return false
            const validTypes = ['url', 'copy', 'quick', 'call']
            return validTypes.includes(b.type) && b.value
        }).map(b => ({
            type: b.type,
            text: String(b.text),
            value: String(b.value)
        }))

        if (validButtons.length === 0) {
            throw new Error('Se requiere al menos un botón válido con type, text y value')
        }

        await sendInteractiveMessage(conn, chatId, text, validButtons)
        return { success: true }
    } catch (error) {
        console.error('[botones] Error en mensajeInteractivo:', error.message)
        // Fallback
        try {
            let texto = `${text}\n`
            validButtons.forEach((b, i) => {
                const emoji = { url: '🔗', copy: '📋', quick: '⚡', call: '📞' }[b.type] || '•'
                texto += `\n${emoji} ${b.text}: ${b.value}`
            })
            await conn.sendMessage(chatId, { text: texto }, options)
            return { success: true, fallback: true }
        } catch (e) {
            return { success: false, error: e.message }
        }
    }
}

/**
 * Envía un menú principal estilo Asta Bot con todas las opciones
 * @param {Object} conn - Conexión de WhatsApp
 * @param {String} chatId - JID del chat
 * @param {String} botName - Nombre del bot
 * @param {Object} options - Opciones adicionales
 */
export async function menuPrincipal(conn, chatId, botName = 'Asta Bot', options = {}) {
    const text = `🎭 *${botName}*\n\nSelecciona una opción:`

    const buttons = [
        { type: 'quick', text: '🎰 Menú Gacha', value: '.gacha' },
        { type: 'quick', text: '👥 Menú Grupo', value: '.grupo' },
        { type: 'quick', text: '🛡️ Menú Antilinks', value: '.antilinks' },
        { type: 'quick', text: '⚔️ Menú RPG', value: '.rpg' },
        { type: 'quick', text: '🎮 Menú Games', value: '.games' },
        { type: 'url', text: '📢 Canal', value: global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21' }
    ]

    return await mensajeInteractivo(conn, chatId, text, buttons, options)
}

/**
 * Verifica si las funciones de botones están disponibles en la versión de Baileys
 * @returns {Object} Estado de disponibilidad de cada función
 */
export function checkBotonesSupport() {
    return {
        sendCopyButton: typeof sendCopyButton === 'function',
        sendUrlButton: typeof sendUrlButton === 'function',
        sendQuickReplyButtons: typeof sendQuickReplyButtons === 'function',
        sendCallButton: typeof sendCallButton === 'function',
        sendListMenu: typeof sendListMenu === 'function',
        sendInteractiveMessage: typeof sendInteractiveMessage === 'function'
    }
}

// Exportación por defecto con todas las funciones
export default {
    botonCopiar,
    botonUrl,
    botonesRapidos,
    botonLlamada,
    menuLista,
    mensajeInteractivo,
    menuPrincipal,
    checkBotonesSupport
}
