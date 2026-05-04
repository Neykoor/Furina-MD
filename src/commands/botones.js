// plugins/botones.js
// CORREGIDO - Usa proto.Message como serbot.js

import { proto, generateWAMessageFromContent, WA_DEFAULT_EPHEMERAL } from '@whiskeysockets/baileys'

let handler = async (m, { conn, usedPrefix }) => {
    
    // ─── BOTÓN COPIAR ───
    if (m.text === `${usedPrefix}boton1`) {
        const interactiveMessage = {
            body: { text: '📋 *CÓDIGO DE INSTALACIÓN*\n\nEjecuta este comando en tu terminal:' },
            footer: { text: 'Asta Bot' },
            header: {
                title: 'npm install asta-bot',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [{
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 Copiar Comando',
                        copy_code: 'npm install asta-bot',
                        id: `copy_${Date.now()}`
                    })
                }],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── BOTÓN URL ───
    else if (m.text === `${usedPrefix}boton2`) {
        const interactiveMessage = {
            body: { text: '🔗 *ENLACES IMPORTANTES*\n\nVisita nuestro repositorio oficial:' },
            footer: { text: 'Asta Bot' },
            header: {
                title: 'GitHub - Asta Bot',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [{
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🌐 Ver GitHub',
                        url: 'https://github.com/Fer2809fl/Asta_bot',
                        merchant_url: 'https://github.com/Fer2809fl/Asta_bot'
                    })
                }],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── BOTONES RÁPIDOS ───
    else if (m.text === `${usedPrefix}boton3`) {
        const interactiveMessage = {
            body: { text: '🎮 *MENÚ DE OPCIONES*\n\n¿Qué deseas hacer?' },
            footer: { text: 'Asta Bot' },
            header: {
                title: 'Selecciona una opción',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Ver Menú',
                            id: 'menu'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'ℹ️ Información',
                            id: 'info'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '👑 Owner',
                            id: 'owner'
                        })
                    }
                ],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── BOTÓN LLAMADA ───
    else if (m.text === `${usedPrefix}boton4`) {
        const interactiveMessage = {
            body: { text: '📞 *SOPORTE TÉCNICO*\n\n¿Necesitas ayuda? Llámanos:' },
            footer: { text: 'Asta Bot' },
            header: {
                title: '+52 1 418 335 7841',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [{
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📞 Llamar Ahora',
                        phone_number: '+5214183357841'
                    })
                }],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── LISTA DESPLEGABLE ───
    else if (m.text === `${usedPrefix}boton5`) {
        const interactiveMessage = {
            body: { text: '📋 *SELECCIONA UNA OPCIÓN*' },
            footer: { text: 'Menú Principal' },
            header: {
                title: 'Asta Bot',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [{
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Abrir Menú',
                        sections: [
                            {
                                title: '📱 COMANDOS BÁSICOS',
                                rows: [
                                    { id: '#menu', title: '📋 Menú', description: 'Ver todos los comandos' },
                                    { id: '#ping', title: '🏓 Ping', description: 'Ver latencia del bot' },
                                    { id: '#owner', title: '👑 Owner', description: 'Información del creador' }
                                ]
                            },
                            {
                                title: '🎮 COMANDOS DE GRUPO',
                                rows: [
                                    { id: '#add', title: '➕ Agregar', description: 'Agregar usuario al grupo' },
                                    { id: '#kick', title: '👢 Expulsar', description: 'Expulsar usuario del grupo' },
                                    { id: '#promote', title: '⭐ Promover', description: 'Dar admin a un usuario' }
                                ]
                            },
                            {
                                title: '🔧 COMANDOS DE CONFIGURACIÓN',
                                rows: [
                                    { id: '#sinprefix', title: '⚙️ Sin Prefijo', description: 'Activar/desactivar prefijo' },
                                    { id: '#antilink', title: '🔗 Anti Link', description: 'Bloquear enlaces' }
                                ]
                            }
                        ]
                    })
                }],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── MÚLTIPLES BOTONES ───
    else if (m.text === `${usedPrefix}boton6`) {
        const interactiveMessage = {
            body: { text: '🎯 *PANEL DE CONTROL*\n\nSelecciona una acción rápida:' },
            footer: { text: 'Asta Bot' },
            header: {
                title: 'Panel Principal',
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🌐 GitHub',
                            url: 'https://github.com/Fer2809fl/Asta_bot',
                            merchant_url: 'https://github.com/Fer2809fl/Asta_bot'
                        })
                    },
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Comando Inicio',
                            copy_code: 'npm start'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 Ver Menú',
                            id: 'menu'
                        })
                    }
                ],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    }
    
    // ─── AYUDA ───
    else if (m.text === `${usedPrefix}botones`) {
        await conn.reply(m.chat, 
            `🧪 *COMANDOS DE PRUEBA - BOTONES INTERACTIVOS*\n\n` +
            `┌✦ *BOTÓN COPIAR*\n` +
            `│ ${usedPrefix}boton1 - Botón que copia texto\n` +
            `│\n` +
            `├✦ *BOTÓN URL*\n` +
            `│ ${usedPrefix}boton2 - Botón que abre enlace\n` +
            `│\n` +
            `├✦ *BOTONES RÁPIDOS*\n` +
            `│ ${usedPrefix}boton3 - Botones de respuesta\n` +
            `│\n` +
            `├✦ *BOTÓN LLAMADA*\n` +
            `│ ${usedPrefix}boton4 - Botón para llamar\n` +
            `│\n` +
            `├✦ *LISTA DESPLEGABLE*\n` +
            `│ ${usedPrefix}boton5 - Menú con opciones\n` +
            `│\n` +
            `└✦ *MÚLTIPLES BOTONES*\n` +
            `  ${usedPrefix}boton6 - Combinación de botones\n\n` +
            `✨ *Prueba cada uno y mira cómo funcionan!*`, m)
    }
}

handler.command = ['boton1', 'boton2', 'boton3', 'boton4', 'boton5', 'boton6', 'botones']
handler.help = ['boton1', 'boton2', 'boton3', 'boton4', 'boton5', 'boton6', 'botones']
handler.tags = ['test']

export default handler
