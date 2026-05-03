/**
 * Sistema Anti-Link para Grupos de WhatsApp
  
  Comandos disponibles:
  .antilink on/off                           - Activar/desactivar el sistema
  .antilink status                           - Ver configuración actual
  .antilink action <delete/kick/mute/warn>   - Establecer acción ante enlaces no permitidos
  .antilink mode <all/blocklist/allowlist>   - Modo de filtrado: todos, lista negra o lista blanca
  .antilink allow <url>                      - Agregar URL a la lista de permitidos
  .antilink block <url>                      - Agregar URL a la lista de bloqueados
  .antilink remove <allow/block> <url>       - Eliminar URL de la lista especificada
  .antilink exempt <admins/bot> <on/off>     - Eximir administradores o el bot de las restricciones
  .antilink warns <1-10>                     - Número de advertencias antes de aplicar acción
  .antilink mute <minutos>                   - Duración del silencio en modo mute
  .antilink reset [@usuario]                 - Reiniciar advertencias de un usuario
  .antilink clear                            - Eliminar toda la configuración del grupo
 */

import fs from 'fs'
import path from 'path'
import {
    getAntilinkConfig,
    setAntilinkConfig,
    removeAntilinkConfig,
    resetWarnings,
    getAllAntilinkConfigs
} from '../funciones/antilink-detector.js'

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════
function cleanNum(jid) {
    if (!jid) return ''
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

async function getAdminInfo(conn, groupJid, senderJid) {
    try {
        const metadata = await conn.groupMetadata(groupJid)
        const participants = metadata.participants || []
        const botJid = conn.user?.jid || conn.user?.id || ''

        const senderNum = cleanNum(senderJid)
        const botNum = cleanNum(botJid)

        const botP = participants.find(p => cleanNum(p.id) === botNum)
        const userP = participants.find(p => cleanNum(p.id) === senderNum)

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isSuperAdmin: userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            isOwner: (global.owner || []).some(o => {
                const oNum = cleanNum(Array.isArray(o) ? o[0] : o)
                return oNum === senderNum
            }),
            groupName: metadata.subject,
            participants
        }
    } catch (e) {
        return { isAdmin: false, isSuperAdmin: false, isBotAdmin: false, isOwner: false, groupName: 'Grupo', participants: [] }
    }
}

function formatTime(ms) {
    const min = Math.floor(ms / 60000)
    const hr = Math.floor(min / 60)
    if (hr > 0) return `${hr}h ${min % 60}m`
    return `${min}m`
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
let handler = async (m, { conn, args, command, usedPrefix }) => {
    const from = m.chat
    const sender = m.sender

    // Solo funciona en grupos
    if (!from.endsWith('@g.us')) {
        return conn.sendMessage(from, {
            text: `👥 *Este comando solo funciona en grupos.*`
        }, { quoted: m })
    }

    // Verificar permisos
    const perms = await getAdminInfo(conn, from, sender)

    // Solo admins del grupo, superadmins, o owners globales pueden usarlo
    // Y el bot DEBE ser admin para poder eliminar mensajes/expulsar
    if (!perms.isAdmin && !perms.isOwner) {
        return conn.sendMessage(from, {
            text: `🛡️ *Solo los administradores del grupo pueden configurar el Anti-Link.*`,
            mentions: [sender]
        }, { quoted: m })
    }

    if (!perms.isBotAdmin) {
        return conn.sendMessage(from, {
            text: `🤖 *Necesito ser administrador del grupo para poder moderar enlaces.*\n\n` +
                  `_Promuéveme a admin para activar el Anti-Link._`,
            mentions: [sender]
        }, { quoted: m })
    }

    const config = getAntilinkConfig(from) || {
        enabled: false,
        action: 'delete',
        mode: 'all',
        allowedLinks: [],
        blockedLinks: [],
        exemptAdmins: true,
        exemptBotAdmin: true,
        warnCount: 3,
        muteDuration: 600000
    }

    // ═══════════════════════════════════════════════════════════════
    // SUBCOMANDOS
    // ═══════════════════════════════════════════════════════════════

    // ── on / off ──
    if (command === 'antilinkon' || (command === 'antilink' && args[0]?.toLowerCase() === 'on')) {
        setAntilinkConfig(from, { enabled: true })
        return conn.sendMessage(from, {
            text: `✅ *Anti-Link ACTIVADO*\n\n` +
                  `🛡️ El bot eliminará enlaces no autorizados en este grupo.\n` +
                  `⚙️ Modo: *${config.mode === 'all' ? 'Todos los enlaces' : config.mode === 'blocklist-only' ? 'Solo lista negra' : 'Solo lista blanca'}*\n` +
                  `🔨 Acción: *${config.action === 'delete' ? 'Eliminar' : config.action === 'kick' ? 'Expulsar' : config.action === 'mute' ? 'Silenciar' : 'Solo advertir'}*\n\n` +
                  `_Usa ${usedPrefix}antilink config para personalizar._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Activado',
                    body: 'Protección contra enlaces no deseados',
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    if (command === 'antilinkoff' || (command === 'antilink' && args[0]?.toLowerCase() === 'off')) {
        setAntilinkConfig(from, { enabled: false })
        return conn.sendMessage(from, {
            text: `❌ *Anti-Link DESACTIVADO*\n\n` +
                  `_El bot ya no moderará enlaces en este grupo._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Desactivado',
                    body: 'Protección desactivada',
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── status ──
    if (command === 'antilinkstatus' || (command === 'antilink' && args[0]?.toLowerCase() === 'status')) {
        const status = config.enabled ? '🟢 *ACTIVADO*' : '🔴 *DESACTIVADO*'
        const actionEmoji = { 'delete': '🗑️', 'kick': '👢', 'mute': '🔇', 'warn-only': '⚠️' }[config.action] || '❓'
        const modeText = { 'all': '🌐 Todos los enlaces', 'blocklist-only': '📛 Solo lista negra', 'allowlist-only': '✅ Solo lista blanca' }[config.mode] || '❓'

        const allowedList = config.allowedLinks?.length 
            ? config.allowedLinks.map(l => `   • \`${l}\``).join('\n')
            : '   _(vacía)_'
        const blockedList = config.blockedLinks?.length
            ? config.blockedLinks.map(l => `   • \`${l}\``).join('\n')
            : '   _(vacía)_'

        return conn.sendMessage(from, {
            text: `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│   🛡️ *ANTI-LINK STATUS*   │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📊 *Estado:* ${status}
👥 *Grupo:* ${perms.groupName}
🆔 *JID:* \`${from}\`

⚙️ *Configuración Actual:*
 ${actionEmoji} *Acción:* ${config.action} (${config.warnCount} advertencias)
 🌐 *Modo:* ${modeText}
 ⏱️ *Mute duration:* ${formatTime(config.muteDuration)}
 👑 *Exempt Admins:* ${config.exemptAdmins ? '✅ Sí' : '❌ No'}
 🤖 *Exempt BotAdmin:* ${config.exemptBotAdmin ? '✅ Sí' : '❌ No'}

✅ *Links Permitidos:*
${allowedList}

📛 *Links Bloqueados:*
${blockedList}

📋 *Comandos disponibles:*
 • ${usedPrefix}antilink on — Activar
 • ${usedPrefix}antilink off — Desactivar
 • ${usedPrefix}antilink action <delete|kick|mute|warn> — Cambiar acción
 • ${usedPrefix}antilink mode <all|blocklist|allowlist> — Cambiar modo
 • ${usedPrefix}antilink allow <url> — Agregar a permitidos
 • ${usedPrefix}antilink block <url> — Agregar a bloqueados
 • ${usedPrefix}antilink remove <allow|block> <url> — Quitar de lista
 • ${usedPrefix}antilink exempt <admins|bot> <on|off> — Exenciones
 • ${usedPrefix}antilink warns <número> — Límite de advertencias
 • ${usedPrefix}antilink mute <minutos> — Duración silencio
 • ${usedPrefix}antilink reset [@usuario] — Reset advertencias
 • ${usedPrefix}antilink clear — Eliminar toda la configuración`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Configuración',
                    body: perms.groupName,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── action ──
    if (command === 'antilinkaction' || (command === 'antilink' && args[0]?.toLowerCase() === 'action')) {
        const action = args[1]?.toLowerCase()
        const validActions = ['delete', 'kick', 'mute', 'warn', 'warn-only']

        if (!validActions.includes(action)) {
            return conn.sendMessage(from, {
                text: `❌ *Acción inválida.*\n\n` +
                      `*Opciones disponibles:*\n` +
                      ` • *delete* — Eliminar mensaje (por defecto)\n` +
                      ` • *kick* — Expulsar del grupo tras X advertencias\n` +
                      ` • *mute* — Silenciar usuario tras X advertencias\n` +
                      ` • *warn* — Solo advertir\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink action kick`
            }, { quoted: m })
        }

        const finalAction = action === 'warn' ? 'warn-only' : action
        setAntilinkConfig(from, { action: finalAction })

        return conn.sendMessage(from, {
            text: `✅ *Acción actualizada:* ${actionEmoji(finalAction)} *${finalAction}*\n\n` +
                  `_${config.warnCount} advertencias antes de aplicar la acción._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Acción Actualizada',
                    body: `Nueva acción: ${finalAction}`,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── mode ──
    if (command === 'antilinkmode' || (command === 'antilink' && args[0]?.toLowerCase() === 'mode')) {
        const mode = args[1]?.toLowerCase()
        const validModes = ['all', 'blocklist', 'allowlist', 'blocklist-only', 'allowlist-only']

        if (!validModes.includes(mode)) {
            return conn.sendMessage(from, {
                text: `❌ *Modo inválido.*\n\n` +
                      `*Opciones disponibles:*\n` +
                      ` • *all* — Bloquear TODOS los enlaces (por defecto)\n` +
                      ` • *blocklist* — Solo bloquear links en lista negra\n` +
                      ` • *allowlist* — Solo permitir links en lista blanca\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink mode blocklist`
            }, { quoted: m })
        }

        const finalMode = mode === 'blocklist' ? 'blocklist-only' : mode === 'allowlist' ? 'allowlist-only' : mode
        setAntilinkConfig(from, { mode: finalMode })

        const modeDesc = {
            'all': '🌐 Se bloquearán TODOS los enlaces excepto los permitidos explícitamente',
            'blocklist-only': '📛 Solo se bloquearán los enlaces en la lista negra',
            'allowlist-only': '✅ Solo se permitirán los enlaces en la lista blanca'
        }[finalMode]

        return conn.sendMessage(from, {
            text: `✅ *Modo actualizado:* *${finalMode}*\n\n${modeDesc}`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Modo Actualizado',
                    body: `Nuevo modo: ${finalMode}`,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── allow (agregar a permitidos) ──
    if (command === 'antilinkallow' || (command === 'antilink' && args[0]?.toLowerCase() === 'allow')) {
        const url = args[1]
        if (!url) {
            return conn.sendMessage(from, {
                text: `❌ *Debes proporcionar una URL.*\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink allow youtube.com\n` +
                      `*Ejemplo:* ${usedPrefix}antilink allow github.com/Fer2809fl`
            }, { quoted: m })
        }

        const allowed = [...(config.allowedLinks || [])]
        const cleanUrl = url.toLowerCase().trim()

        if (allowed.includes(cleanUrl)) {
            return conn.sendMessage(from, {
                text: `⚠️ *\`${cleanUrl}\` ya está en la lista de permitidos.*`
            }, { quoted: m })
        }

        allowed.push(cleanUrl)
        setAntilinkConfig(from, { allowedLinks: allowed })

        return conn.sendMessage(from, {
            text: `✅ *Agregado a permitidos:*\n\n` +
                  `\`${cleanUrl}\`\n\n` +
                  `📋 *Lista actual:* ${allowed.length} link(s) permitido(s)`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link - Link Permitido',
                    body: cleanUrl,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── block (agregar a bloqueados) ──
    if (command === 'antilinkblock' || (command === 'antilink' && args[0]?.toLowerCase() === 'block')) {
        const url = args[1]
        if (!url) {
            return conn.sendMessage(from, {
                text: `❌ *Debes proporcionar una URL.*\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink block facebook.com\n` +
                      `*Ejemplo:* ${usedPrefix}antilink block tiktok.com`
            }, { quoted: m })
        }

        const blocked = [...(config.blockedLinks || [])]
        const cleanUrl = url.toLowerCase().trim()

        if (blocked.includes(cleanUrl)) {
            return conn.sendMessage(from, {
                text: `⚠️ *\`${cleanUrl}\` ya está en la lista de bloqueados.*`
            }, { quoted: m })
        }

        blocked.push(cleanUrl)
        setAntilinkConfig(from, { blockedLinks: blocked })

        return conn.sendMessage(from, {
            text: `📛 *Agregado a bloqueados:*\n\n` +
                  `\`${cleanUrl}\`\n\n` +
                  `📋 *Lista actual:* ${blocked.length} link(s) bloqueado(s)`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link - Link Bloqueado',
                    body: cleanUrl,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── remove (quitar de lista) ──
    if (command === 'antilinkremove' || (command === 'antilink' && args[0]?.toLowerCase() === 'remove')) {
        const listType = args[1]?.toLowerCase() // 'allow' o 'block'
        const url = args[2]

        if (!['allow', 'block'].includes(listType) || !url) {
            return conn.sendMessage(from, {
                text: `❌ *Uso incorrecto.*\n\n` +
                      `${usedPrefix}antilink remove allow <url> — Quitar de permitidos\n` +
                      `${usedPrefix}antilink remove block <url> — Quitar de bloqueados`
            }, { quoted: m })
        }

        const cleanUrl = url.toLowerCase().trim()

        if (listType === 'allow') {
            const allowed = (config.allowedLinks || []).filter(l => l !== cleanUrl)
            setAntilinkConfig(from, { allowedLinks: allowed })
            return conn.sendMessage(from, {
                text: `✅ *\`${cleanUrl}\` eliminado de la lista de permitidos.*`
            }, { quoted: m })
        } else {
            const blocked = (config.blockedLinks || []).filter(l => l !== cleanUrl)
            setAntilinkConfig(from, { blockedLinks: blocked })
            return conn.sendMessage(from, {
                text: `✅ *\`${cleanUrl}\` eliminado de la lista de bloqueados.*`
            }, { quoted: m })
        }
    }

    // ── exempt (exenciones) ──
    if (command === 'antilinkexempt' || (command === 'antilink' && args[0]?.toLowerCase() === 'exempt')) {
        const target = args[1]?.toLowerCase() // 'admins' o 'bot'
        const state = args[2]?.toLowerCase() // 'on' o 'off'

        if (!['admins', 'bot'].includes(target) || !['on', 'off'].includes(state)) {
            return conn.sendMessage(from, {
                text: `❌ *Uso incorrecto.*\n\n` +
                      `${usedPrefix}antilink exempt admins on/off — Eximir admins del grupo\n` +
                      `${usedPrefix}antilink exempt bot on/off — Eximir bot admin`
            }, { quoted: m })
        }

        const updates = {}
        if (target === 'admins') updates.exemptAdmins = state === 'on'
        if (target === 'bot') updates.exemptBotAdmin = state === 'on'

        setAntilinkConfig(from, updates)

        const targetName = target === 'admins' ? 'Administradores del grupo' : 'Bot (admin)'
        const stateEmoji = state === 'on' ? '✅' : '❌'

        return conn.sendMessage(from, {
            text: `${stateEmoji} *${targetName}* ${state === 'on' ? 'eximidos' : 'sujetos'} del Anti-Link.`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Exenciones',
                    body: `${targetName}: ${state}`,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── warns (límite de advertencias) ──
    if (command === 'antilinkwarns' || (command === 'antilink' && args[0]?.toLowerCase() === 'warns')) {
        const count = parseInt(args[1])
        if (isNaN(count) || count < 1 || count > 10) {
            return conn.sendMessage(from, {
                text: `❌ *Debes proporcionar un número entre 1 y 10.*\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink warns 3`
            }, { quoted: m })
        }

        setAntilinkConfig(from, { warnCount: count })
        return conn.sendMessage(from, {
            text: `✅ *Límite de advertencias:* ${count}\n\n` +
                  `_Tras ${count} advertencias se aplicará la acción configurada._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Advertencias',
                    body: `Límite: ${count}`,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── mute (duración silencio) ──
    if (command === 'antilinkmute' || (command === 'antilink' && args[0]?.toLowerCase() === 'mute')) {
        const minutes = parseInt(args[1])
        if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
            return conn.sendMessage(from, {
                text: `❌ *Debes proporcionar minutos entre 1 y 1440 (24h).*\n\n` +
                      `*Ejemplo:* ${usedPrefix}antilink mute 10`
            }, { quoted: m })
        }

        const durationMs = minutes * 60000
        setAntilinkConfig(from, { muteDuration: durationMs })

        return conn.sendMessage(from, {
            text: `✅ *Duración de silencio:* ${minutes} minutos\n\n` +
                  `_Usuarios silenciados no podrán enviar mensajes con enlaces durante este tiempo._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Mute',
                    body: `${minutes} minutos`,
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── reset (resetear advertencias) ──
    if (command === 'antilinkreset' || (command === 'antilink' && args[0]?.toLowerCase() === 'reset')) {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
        const target = mentioned || quoted || null

        if (target) {
            const targetNum = cleanNum(target)
            resetWarnings(from, targetNum)
            return conn.sendMessage(from, {
                text: `🔄 *Advertencias reseteadas para* @${targetNum}.`,
                mentions: [target]
            }, { quoted: m })
        } else {
            resetWarnings(from, null)
            return conn.sendMessage(from, {
                text: `🔄 *Todas las advertencias del grupo han sido reseteadas.*`,
                contextInfo: {
                    externalAdReply: {
                        title: 'Anti-Link Reset',
                        body: 'Advertencias limpiadas',
                        thumbnailUrl: global.icono || '',
                        mediaType: 1,
                        sourceUrl: global.channel || ''
                    }
                }
            }, { quoted: m })
        }
    }

    // ── clear (eliminar configuración) ──
    if (command === 'antilinkclear' || (command === 'antilink' && args[0]?.toLowerCase() === 'clear')) {
        removeAntilinkConfig(from)
        return conn.sendMessage(from, {
            text: `🗑️ *Configuración Anti-Link eliminada.*\n\n` +
                  `_El grupo ya no tiene configuración de Anti-Link. Usa ${usedPrefix}antilink on para reactivar._`,
            contextInfo: {
                externalAdReply: {
                    title: 'Anti-Link Eliminado',
                    body: 'Configuración reseteada',
                    thumbnailUrl: global.icono || '',
                    mediaType: 1,
                    sourceUrl: global.channel || ''
                }
            }
        }, { quoted: m })
    }

    // ── MENÚ PRINCIPAL (sin argumentos o comando no reconocido) ──
    return conn.sendMessage(from, {
        text: `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│     🛡️ *ANTI-LINK SYSTEM*     │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🛡️ *Protege tu grupo de enlaces no deseados.*

📋 *Comandos disponibles:*

🔰 *Activación:*
 • ${usedPrefix}antilink on — Activar
 • ${usedPrefix}antilink off — Desactivar
 • ${usedPrefix}antilink status — Ver estado

⚙️ *Configuración:*
 • ${usedPrefix}antilink action <delete|kick|mute|warn> — Acción al detectar
 • ${usedPrefix}antilink mode <all|blocklist|allowlist> — Modo de filtrado
 • ${usedPrefix}antilink warns <1-10> — Límite de advertencias
 • ${usedPrefix}antilink mute <minutos> — Duración silencio

📋 *Listas:*
 • ${usedPrefix}antilink allow <url> — Agregar a permitidos
 • ${usedPrefix}antilink block <url> — Agregar a bloqueados
 • ${usedPrefix}antilink remove <allow|block> <url> — Quitar de lista

👑 *Exenciones:*
 • ${usedPrefix}antilink exempt admins on/off — Eximir admins
 • ${usedPrefix}antilink exempt bot on/off — Eximir bot admin

🔄 *Gestión:*
 • ${usedPrefix}antilink reset [@user] — Reset advertencias
 • ${usedPrefix}antilink clear — Eliminar toda la config

💡 *Ejemplo rápido:*
_${usedPrefix}antilink on_
_${usedPrefix}antilink action delete_
_${usedPrefix}antilink allow youtube.com_`,
        contextInfo: {
            externalAdReply: {
                title: 'Anti-Link System',
                body: 'Protección contra enlaces no deseados',
                thumbnailUrl: global.icono || '',
                mediaType: 1,
                sourceUrl: global.channel || ''
            }
        }
    }, { quoted: m })
}

// Helper para emoji de acción
function actionEmoji(action) {
    return { 'delete': '🗑️', 'kick': '👢', 'mute': '🔇', 'warn-only': '⚠️' }[action] || '❓'
}

// ═══════════════════════════════════════════════════════════════════
// METADATA DEL COMANDO
// ═══════════════════════════════════════════════════════════════════
handler.help = [
    'antilink',
    'antilinkon', 'antilinkoff',
    'antilinkstatus',
    'antilinkaction',
    'antilinkmode',
    'antilinkallow',
    'antilinkblock',
    'antilinkremove',
    'antilinkexempt',
    'antilinkwarns',
    'antilinkmute',
    'antilinkreset',
    'antilinkclear'
]
handler.tags = ['group']
handler.command = [
    'antilink',
    'antilinkon', 'antilinkoff',
    'antilinkstatus',
    'antilinkaction',
    'antilinkmode',
    'antilinkallow',
    'antilinkblock',
    'antilinkremove',
    'antilinkexempt',
    'antilinkwarns',
    'antilinkmute',
    'antilinkreset',
    'antilinkclear'
]
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
