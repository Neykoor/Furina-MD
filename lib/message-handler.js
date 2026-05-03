import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const erroresRuntimeFile = path.join(process.cwd(), 'data', 'errores-runtime.json')

// Cache de metadata de grupo: 30s TTL
const groupCache = new NodeCache({ stdTTL: 30 })

// ══════════════════════════════════════════════════════════════════
function registrarError(archivo, comando, sender, err) {
    try {
        let errores = []
        if (fs.existsSync(erroresRuntimeFile)) {
            errores = JSON.parse(fs.readFileSync(erroresRuntimeFile, 'utf-8'))
        }
        errores.unshift({
            archivo,
            comando,
            sender,
            error: err.message,
            stack: err.stack?.slice(0, 400) || '',
            fecha: new Date().toLocaleString()
        })
        fs.mkdirSync(path.dirname(erroresRuntimeFile), { recursive: true })
        fs.writeFileSync(erroresRuntimeFile, JSON.stringify(errores.slice(0, 30), null, 2))
    } catch { }
}

// ══════════════════════════════════════════════════════════════════
function getTipoMensaje(msg) {
    if (!msg?.message) return null
    const tipos = [
        'conversation', 'imageMessage', 'videoMessage', 'audioMessage',
        'stickerMessage', 'documentMessage', 'extendedTextMessage',
        'reactionMessage', 'locationMessage', 'contactMessage',
        'pollCreationMessage', 'buttonsResponseMessage', 'listResponseMessage',
        'templateButtonReplyMessage', 'interactiveResponseMessage',
        'liveLocationMessage', 'contactsArrayMessage',
        'documentWithCaptionMessage', 'viewOnceMessage',
        'pollCreationMessageV2', 'pollCreationMessageV3'
    ]
    for (const tipo of tipos) {
        if (msg.message?.[tipo]) return tipo
    }
    return null
}

// ══════════════════════════════════════════════════════════════════
function checkOwner(sender) {
    const num = String(sender).replace(/[^0-9]/g, '')
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => {
        const ownerNum = String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '')
        return ownerNum === num
    })
}

// ══════════════════════════════════════════════════════════════════
// ✅ FUNCIÓN REPARADA - Manejo completo de LID + múltiples fallbacks
// ══════════════════════════════════════════════════════════════════
async function getAdminInfo(conn, groupJid, senderJid) {
    try {
        let metadata = groupCache.get(groupJid)
        if (!metadata) {
            metadata = await conn.groupMetadata(groupJid)
            groupCache.set(groupJid, metadata)
        }

        const participants = metadata.participants || []

        // ── Normalizar JIDs (quitar @s.whatsapp.net, @lid, etc.) ──
        const normalizeJid = (jid) => {
            if (!jid) return ''
            return String(jid).split('@')[0].replace(/[^0-9]/g, '')
        }

        // ── Obtener TODAS las identidades posibles del bot ──
        // WhatsApp LID: el bot puede tener múltiples identidades
        const botIdentities = new Set()

        // 1. ID principal
        if (conn.user?.id) botIdentities.add(conn.user.id)
        if (conn.user?.jid) botIdentities.add(conn.user.jid)
        if (conn.user?.lid) botIdentities.add(conn.user.lid)

        // 2. Fallbacks adicionales de Baileys
        if (conn.authState?.creds?.me?.id) botIdentities.add(conn.authState.creds.me.id)
        if (conn.authState?.creds?.me?.jid) botIdentities.add(conn.authState.creds.me.jid)
        if (conn.authState?.creds?.me?.lid) botIdentities.add(conn.authState.creds.me.lid)

        // 3. Construir versiones alternativas
        const botNums = new Set()
        for (const id of botIdentities) {
            botNums.add(normalizeJid(id))
            // También guardar el JID completo para comparación directa
            botNums.add(String(id).toLowerCase().trim())
        }

        // ── Obtener identidad del sender ──
        const senderNum = normalizeJid(senderJid)

        // ── Buscar al bot en participantes con múltiples estrategias ──
        let botP = null
        let userP = null

        for (const p of participants) {
            const pId = String(p.id || '').toLowerCase().trim()
            const pNum = normalizeJid(p.id)

            // Estrategia 1: Comparación directa de JID completo
            if (botIdentities.has(pId) || botIdentities.has(p.id)) {
                botP = p
                continue
            }

            // Estrategia 2: Comparación por número limpio
            for (const botNum of botNums) {
                if (pNum === botNum && botNum.length > 5) {
                    botP = p
                    break
                }
            }

            // Buscar al sender
            if (pNum === senderNum && senderNum.length > 5) {
                userP = p
            }
        }

        // ── DEBUG: Descomenta para verificar en consola ──
        // console.log(chalk.yellow(`[ADMIN DEBUG] Group: ${groupJid}`))
        // console.log(chalk.yellow(`[ADMIN DEBUG] Bot IDs: ${[...botIdentities].join(', ')}`))
        // console.log(chalk.yellow(`[ADMIN DEBUG] Bot encontrado: ${botP ? 'SÍ' : 'NO'} | Admin: ${botP?.admin || 'N/A'}`))
        // console.log(chalk.yellow(`[ADMIN DEBUG] Total participantes: ${participants.length}`))

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            participants,
            metadata,
            // Exponer info de debug para comandos que la necesiten
            debug: {
                botFound: !!botP,
                botAdmin: botP?.admin || null,
                totalParticipants: participants.length
            }
        }
    } catch (err) {
        console.error(chalk.red('[getAdminInfo ERROR]'), err.message)
        return { 
            isAdmin: false, 
            isBotAdmin: false, 
            participants: [], 
            metadata: null,
            debug: { botFound: false, botAdmin: null, totalParticipants: 0 }
        }
    }
}

// ══════════════════════════════════════════════════════════════════
async function dfail(tipo, m, conn, cmd = '') {
    const mensajes = {
        owner:    '👑 Este comando es solo para *owners*.',
        group:    '👥 Este comando solo funciona en *grupos*.',
        private:  '👤 Este comando solo funciona en *privado*.',
        admin:    '🛡️ Necesitas ser *administrador* del grupo.',
        botAdmin: '🤖 Necesito ser *administrador* para ejecutar esto.',
        invalid:  `❌ El comando *${cmd}* no existe.`
    }

    let textoBase = mensajes[tipo] || '🚫 Sin permiso.'
    if (tipo === 'invalid' && global.msj?.validcommand) {
        textoBase = global.msj.validcommand.replace('${cmd}', cmd)
    }

    const chatId = m.key?.remoteJid || m.chat
    const channelLink = global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
    const emoji = { owner: '👑', group: '👥', private: '👤', admin: '🛡️', botAdmin: '🤖', invalid: '' }[tipo] || '🚫'
    const mensajeFinal = tipo !== 'invalid' ? `${emoji} ${textoBase}` : textoBase

    let logoBuffer = global.botLogoCache
    if (!logoBuffer && global.icono) {
        try {
            const res = await fetch(global.icono)
            logoBuffer = Buffer.from(await res.arrayBuffer())
            global.botLogoCache = logoBuffer
        } catch {
            logoBuffer = null
        }
    }

    try {
        await conn.sendMessage(chatId, {
            text: mensajeFinal,
            contextInfo: {
                externalAdReply: {
                    title: global.namebot || 'Bot',
                    body: 'Canal Oficial',
                    thumbnail: logoBuffer,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false,
                    sourceUrl: channelLink
                }
            }
        })
    } catch {
        try { await conn.sendMessage(chatId, { text: mensajeFinal }) } catch { }
    }
}

// ══════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export async function handleMessage(sock, m, commands) {
    try {
        if (!sock || !m) return

        const tipo = getTipoMensaje(m)
        if (!tipo) return

        const from = m.key.remoteJid
        let senderJid = m.key.participant || from

        // Resolución de IDs tipo LID (cuentas nuevas de WA)
        if (sock.lid && senderJid.endsWith('@lid')) {
            const resuelto = await sock.lid.resolve(senderJid)
            if (resuelto) senderJid = resuelto
        }

        const isGroup  = from.endsWith('@g.us')
        const fromMe   = m.key?.fromMe || false
        const usedPrefix = global.prefix || '.'

        let text = ''
        try {
            text = m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                m.message?.videoMessage?.caption ||
                m.message?.documentMessage?.caption || ''
        } catch { text = '' }

        // Print en consola (no bloquea el flujo)
        try {
            const { printMensaje } = await import('./print.js')
            if (!fromMe) printMensaje(m, sock)
        } catch { }

        // ── Calcular permisos UNA vez — se reusan en antis y en comandos ──
        const isOwner = checkOwner(senderJid)
        let isAdmin    = false
        let isBotAdmin = false
        let groupMetadata = null
        let participants  = []

        if (isGroup) {
            const info = await getAdminInfo(sock, from, senderJid)
            isAdmin       = info.isAdmin
            isBotAdmin    = info.isBotAdmin
            groupMetadata = info.metadata
            participants  = info.participants

            // Debug opcional
            if (global.debugMode && info.debug) {
                console.log(chalk.gray(`[PERMISOS] Admin:${isAdmin} | BotAdmin:${isBotAdmin} | BotFound:${info.debug.botFound}`))
            }
        }

        // ── Anti-Link avanzado (antilink-detector.js) ──────────────
        try {
            const { antilinkDetector } = await import('../src/commands/funciones/antilink-detector.js')
            const blocked = await antilinkDetector(sock, m)
            if (blocked) return
        } catch { }

        // ── Anti-Master (anti-config.json) ─────────────────────────
        // Recibe isBotAdmin e isAdmin ya calculados — sin llamada extra
        // a groupMetadata. Solo actúa si el bot es admin del grupo.
        try {
            const { antiMasterDetector } = await import('../src/commands/funciones/anti-master.js')
            const blocked = await antiMasterDetector(sock, m, { isBotAdmin, isAdmin })
            if (blocked) return
        } catch { }

        // ── Procesamiento de comandos ───────────────────────────────
        if (!text || !text.startsWith(usedPrefix)) return

        const args = text.slice(usedPrefix.length).trim().split(/\s+/)
        const command = args.shift()?.toLowerCase()
        if (!command) return

        // Inyectar propiedades calculadas en el objeto mensaje
        m.chat      = from
        m.sender    = senderJid
        m.timestamp = Date.now()
        m.isGroup   = isGroup
        m.isAdmin   = isAdmin
        m.isBotAdmin = isBotAdmin
        m.isOwner   = isOwner
        m.text      = text

        const found = commands.get(command)
        if (!found) {
            await dfail('invalid', m, sock, command)
            return
        }

        const { plugin, filePath } = found
        const relativo = path.relative(path.join(process.cwd(), 'src', 'commands'), filePath)

        console.log(
            chalk.bgBlue.white(`\n⚡ COMANDO: ${usedPrefix}${command}`),
            chalk.gray(`[${relativo}]`),
            chalk.cyan(`(R: ${senderJid})`),
            chalk.gray(`args: [${args.join(', ')}]`)
        )

        // ── Verificar permisos del plugin antes de ejecutar ─────────
        if (plugin.owner    && !isOwner)    { await dfail('owner',    m, sock);        return }
        if (plugin.group    && !isGroup)    { await dfail('group',    m, sock);        return }
        if (plugin.private  && isGroup)     { await dfail('private',  m, sock);        return }
        if (plugin.admin    && !isAdmin)    { await dfail('admin',    m, sock);        return }
        if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, sock);        return }

        // ── Ejecutar plugin ─────────────────────────────────────────
        try {
            await plugin(m, {
                conn: sock,
                args,
                usedPrefix,
                isOwner,
                command,
                isGroup,
                isAdmin,
                isBotAdmin,
                groupMetadata,
                participants,
                fromMe,
                text: args.join(' ')
            })
        } catch (err) {
            registrarError(relativo, command, senderJid, err)
            const errorMsg = global.msj?.error || '❌ Error al ejecutar el comando.'
            try { await sock.sendMessage(from, { text: errorMsg }, { quoted: m }) } catch { }
        }

    } catch (error) {
        console.error(chalk.red('❌ Error crítico en handleMessage:'), error)
    }
}
