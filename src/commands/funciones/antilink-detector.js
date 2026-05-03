import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y CONSTANTES
// ═══════════════════════════════════════════════════════════════════
const ANTILINK_DB = path.join(process.cwd(), 'data', 'antilink-config.json')
const WARN_COOLDOWN = 5 * 60 * 1000 // 5 minutos entre advertencias al mismo usuario

// Cache para evitar lecturas repetidas de disco
const configCache = new NodeCache({ stdTTL: 30, checkperiod: 60 })

// Regex mejorados para detectar TODO tipo de enlaces
const LINK_PATTERNS = {
    // WhatsApp
    whatsapp: /(?:https?:\/\/)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?[a-zA-Z0-9]{10,30}/gi,
    whatsapp2: /wa\.me\/[0-9]+/gi,

    // Redes sociales
    facebook: /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook|fb)\.com\/[a-zA-Z0-9._-]+/gi,
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi,
    twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/gi,
    tiktok: /(?:https?:\/\/)?(?:www\.|vm\.)?tiktok\.com\/[a-zA-Z0-9._-]+/gi,
    youtube: /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]+/gi,
    youtube2: /youtube\.com\/(?:channel|user|c)\/[a-zA-Z0-9_-]+/gi,

    // Mensajería
    telegram: /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[a-zA-Z0-9._-]+/gi,
    discord: /(?:https?:\/\/)?(?:discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9_-]+/gi,
    signal: /signal\.group\/[a-zA-Z0-9_-]+/gi,

    // Otros
    twitch: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/[a-zA-Z0-9._-]+/gi,
    reddit: /(?:https?:\/\/)?(?:www\.)?reddit\.com\/[a-zA-Z0-9._-]+/gi,
    spotify: /(?:https?:\/\/)?(?:open\.)?spotify\.com\/[a-zA-Z0-9._-]+/gi,

    // Genérico (cualquier URL con dominio conocido)
    generic: /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]*)?/gi
}

// Dominios siempre permitidos (CDNs del sistema y APIs oficiales del bot)
// NO agregar redes sociales aquí — usar .antilink allow <dominio> por grupo
const WHITELIST_DOMAINS = [
    'whatsapp.net',  // API interna de WhatsApp
    'fbcdn.net',     // CDN de imágenes de WhatsApp/Meta
    'gstatic.com',   // Google CDN (íconos, fuentes)
]

// Cache de usuarios advertidos recientemente
const warnedUsers = new NodeCache({ stdTTL: WARN_COOLDOWN / 1000 })

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════
function ensureDb() {
    try {
        if (!fs.existsSync(ANTILINK_DB)) {
            const defaultDb = {
                _info: "Base de datos global de configuración antilink por grupo",
                _version: "1.0.0",
                groups: {}
            }
            fs.mkdirSync(path.dirname(ANTILINK_DB), { recursive: true })
            fs.writeFileSync(ANTILINK_DB, JSON.stringify(defaultDb, null, 2))
            return defaultDb
        }
        return JSON.parse(fs.readFileSync(ANTILINK_DB, 'utf-8'))
    } catch (e) {
        console.error(chalk.red('❌ Error leyendo antilink DB:'), e.message)
        return { groups: {} }
    }
}

function saveDb(db) {
    try {
        fs.writeFileSync(ANTILINK_DB, JSON.stringify(db, null, 2))
    } catch (e) {
        console.error(chalk.red('❌ Error guardando antilink DB:'), e.message)
    }
}

function getGroupConfig(groupJid) {
    const cached = configCache.get(groupJid)
    if (cached) return cached

    const db = ensureDb()
    const cfg = db.groups[groupJid] || null
    if (cfg) configCache.set(groupJid, cfg)
    return cfg
}

// ═══════════════════════════════════════════════════════════════════
// DETECCIÓN DE ENLACES
// ═══════════════════════════════════════════════════════════════════
function detectLinks(text, config) {
    if (!text || typeof text !== 'string') return []

    const detected = []
    const { allowedLinks = [], blockedLinks = [] } = config

    // Normalizar listas a minúsculas
    const allowed = allowedLinks.map(l => l.toLowerCase().trim())
    const blocked = blockedLinks.map(l => l.toLowerCase().trim())

    // Revisar cada patrón
    for (const [type, regex] of Object.entries(LINK_PATTERNS)) {
        const matches = text.match(regex) || []
        for (const match of matches) {
            const lowerMatch = match.toLowerCase()

            // Verificar si está en whitelist global
            if (WHITELIST_DOMAINS.some(d => lowerMatch.includes(d))) continue

            // Verificar si está explícitamente permitido
            if (allowed.some(a => lowerMatch.includes(a))) continue

            // Verificar si está explícitamente bloqueado
            const isBlocked = blocked.some(b => lowerMatch.includes(b))

            detected.push({
                url: match,
                type,
                isBlocked,
                isAllowed: false
            })
        }
    }

    // Eliminar duplicados
    return detected.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i)
}

// ═══════════════════════════════════════════════════════════════════
// VERIFICACIÓN DE PERMISOS
// ═══════════════════════════════════════════════════════════════════
async function getParticipantInfo(sock, groupJid, userJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid)
        const participants = metadata.participants || []
        const botJid = sock.user?.jid || sock.user?.id || ''

        const userP = participants.find(p => {
            const pId = String(p.id).split('@')[0].replace(/\D/g, '')
            const uId = String(userJid).split('@')[0].replace(/\D/g, '')
            return pId === uId
        })

        const botP = participants.find(p => {
            const pId = String(p.id).split('@')[0].replace(/\D/g, '')
            const bId = String(botJid).split('@')[0].replace(/\D/g, '')
            return pId === bId
        })

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isSuperAdmin: userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            isOwner: (global.owner || []).some(o => {
                const oNum = String(Array.isArray(o) ? o[0] : o).replace(/\D/g, '')
                const uNum = String(userJid).replace(/\D/g, '')
                return oNum === uNum
            }),
            metadata
        }
    } catch (e) {
        return { isAdmin: false, isSuperAdmin: false, isBotAdmin: false, isOwner: false, metadata: null }
    }
}

// ═══════════════════════════════════════════════════════════════════
// ACCIONES CONTRA ENLACES
// ═══════════════════════════════════════════════════════════════════
async function takeAction(sock, msg, groupJid, senderJid, detectedLinks, config) {
    const { action = 'delete', warnCount = 3, muteDuration = 600000 } = config
    const userNum = senderJid.split('@')[0]
    const warnKey = `${groupJid}:${userNum}`

    // Contar advertencias
    let currentWarns = warnedUsers.get(warnKey) || 0
    currentWarns++
    warnedUsers.set(warnKey, currentWarns)

    // Construir mensaje de advertencia
    const remaining = Math.max(0, warnCount - currentWarns)
    const linksList = detectedLinks.map(l => `• \`${l.url}\` (${l.type})`).join('\n')

    let warningText = `🛡️ *Anti-Link Activado*

    @${userNum} *envió enlaces no permitidos:*
    ${linksList}

    ⚠️ *Advertencia ${currentWarns}/${warnCount}*
    🔴 *Restantes:* ${remaining}

    `

    if (remaining <= 0) {
        warningText += `⛔ *Has alcanzado el límite de advertencias.*
    _Acción aplicada: ${action === 'kick' ? 'Expulsión' : action === 'mute' ? 'Silenciado' : 'Mensajes eliminados'}_`
    } else {
        warningText += `📵 *Evita enviar enlaces no autorizados para no ser sancionado.*`
    }

    try {
        // 1. Eliminar mensaje original
        await sock.sendMessage(groupJid, { delete: msg.key })

        // 2. Enviar advertencia
        await sock.sendMessage(groupJid, {
            text: warningText,
            mentions: [senderJid]
        })

        // 3. Aplicar acción si superó el límite
        if (currentWarns >= warnCount) {
            warnedUsers.del(warnKey)

            switch (action) {
                case 'kick':
                    await sock.groupParticipantsUpdate(groupJid, [senderJid], 'remove')
                    await sock.sendMessage(groupJid, {
                        text: `👢 @${userNum} *fue expulsado* por enviar enlaces no permitidos repetidamente.`,
                        mentions: [senderJid]
                    })
                    break

                case 'mute':
                    // Nota: Baileys no tiene mute nativo, simulamos con restricción
                    await sock.sendMessage(groupJid, {
                        text: `🔇 @${userNum} *ha sido silenciado* por ${muteDuration / 60000} minutos.`,
                        mentions: [senderJid]
                    })
                    // Guardar en cache de silenciados (el detector lo respetará)
                    const mutedKey = `muted:${groupJid}:${userNum}`
                    warnedUsers.set(mutedKey, true, muteDuration / 1000)
                    break

                case 'warn-only':
                    // Solo advertencias, ya se envió arriba
                    break

                default: // 'delete'
                    // Solo eliminar, ya se hizo arriba
                    break
            }
        }

        return true
    } catch (e) {
        console.error(chalk.red('❌ Error aplicando acción antilink:'), e.message)
        return false
    }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL - LLAMADO DESDE message-handler.js
// ═══════════════════════════════════════════════════════════════════
export async function antilinkDetector(sock, msg) {
    try {
        // Solo procesar mensajes de grupos
        const groupJid = msg.key?.remoteJid
        if (!groupJid || !groupJid.endsWith('@g.us')) return false

        // Ignorar mensajes del bot mismo
        if (msg.key?.fromMe) return false

        // Ignorar mensajes sin contenido de texto
        const text = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.documentMessage?.caption || ''

        if (!text) return false

        // Obtener configuración del grupo
        const config = getGroupConfig(groupJid)
        if (!config || !config.enabled) return false

        // Verificar si el antilink está activo
        if (config.enabled !== true) return false

        // Obtener info del remitente
        const senderJid = msg.key?.participant || msg.key?.remoteJid
        const userNum = String(senderJid).split('@')[0].replace(/\D/g, '')

        // Verificar si el usuario está silenciado
        const mutedKey = `muted:${groupJid}:${userNum}`
        if (warnedUsers.get(mutedKey)) {
            // Usuario silenciado - eliminar mensaje sin advertencia
            await sock.sendMessage(groupJid, { delete: msg.key })
            return true
        }

        // Verificar permisos del remitente
        const perms = await getParticipantInfo(sock, groupJid, senderJid)

        // Excepciones: Owner global, admin del grupo, o bot admin
        if (perms.isOwner) return false
        if (config.exemptAdmins && perms.isAdmin) return false
        if (config.exemptBotAdmin && perms.isBotAdmin) return false

        // Detectar enlaces
        const detected = detectLinks(text, config)
        if (!detected.length) return false

        // Verificar si hay enlaces bloqueados específicamente
        const hasBlocked = detected.some(l => l.isBlocked)
        const hasGeneric = detected.some(l => !l.isAllowed && !l.isBlocked)

        // Si el modo es 'blocklist-only', solo actuar sobre enlaces bloqueados explícitamente
        if (config.mode === 'blocklist-only' && !hasBlocked) return false

        // Si el modo es 'allowlist-only', bloquear todo excepto los permitidos
        if (config.mode === 'allowlist-only' && !hasGeneric) return false

        // Log en consola
        console.log(chalk.yellow(
            `🛡️ ANTILINK | Grupo: ${groupJid} | User: ${userNum} | ` +
            `Links: ${detected.length} | Acción: ${config.action}`
        ))

        // Aplicar acción
        return await takeAction(sock, msg, groupJid, senderJid, detected, config)

    } catch (e) {
        console.error(chalk.red('❌ Error en antilinkDetector:'), e.message)
        return false
    }
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES EXPORTADAS PARA EL COMANDO antilink.js
// ═══════════════════════════════════════════════════════════════════

export function getAntilinkConfig(groupJid) {
    return getGroupConfig(groupJid)
}

export function setAntilinkConfig(groupJid, updates) {
    const db = ensureDb()
    if (!db.groups[groupJid]) {
        db.groups[groupJid] = {
            enabled: false,
            action: 'delete',
            mode: 'all', // 'all', 'blocklist-only', 'allowlist-only'
            allowedLinks: [],
            blockedLinks: [],
            exemptAdmins: true,
            exemptBotAdmin: true,
            warnCount: 3,
            muteDuration: 600000, // 10 minutos
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    }

    db.groups[groupJid] = {
        ...db.groups[groupJid],
        ...updates,
        updatedAt: new Date().toISOString()
    }

    saveDb(db)
    configCache.set(groupJid, db.groups[groupJid])
    return db.groups[groupJid]
}

export function removeAntilinkConfig(groupJid) {
    const db = ensureDb()
    delete db.groups[groupJid]
    saveDb(db)
    configCache.del(groupJid)
    return true
}

export function getAllAntilinkConfigs() {
    const db = ensureDb()
    return db.groups
}

export function resetWarnings(groupJid, userNum = null) {
    if (userNum) {
        const warnKey = `${groupJid}:${userNum}`
        warnedUsers.del(warnKey)
        const mutedKey = `muted:${groupJid}:${userNum}`
        warnedUsers.del(mutedKey)
    } else {
        // Resetear todas las advertencias del grupo
        const keys = warnedUsers.keys()
        for (const key of keys) {
            if (key.startsWith(`${groupJid}:`) || key.startsWith(`muted:${groupJid}:`)) {
                warnedUsers.del(key)
            }
        }
    }
    return true
}

export { ensureDb, saveDb }
