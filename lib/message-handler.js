import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const erroresRuntimeFile = path.join(process.cwd(), 'data', 'errores-runtime.json')

// Cache de metadata de grupo: 30s
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
// OBTIENE PERMISOS DEL GRUPO
// FIX: Resuelve LIDs de participantes antes de comparar con el bot.
// Los grupos con identidades ocultas usan @lid en lugar de números normales.
// ══════════════════════════════════════════════════════════════════
async function getAdminInfo(conn, groupJid, senderJid) {
    try {
        let metadata = groupCache.get(groupJid)
        if (!metadata) {
            metadata = await conn.groupMetadata(groupJid)
            groupCache.set(groupJid, metadata)
        }

        const participants = metadata.participants || []
        const senderNum = String(senderJid).replace(/[^0-9]/g, '')

        // ─── Preparar identidades del bot ───
        const botJidRaw = conn.user?.id || conn.user?.jid || ''
        const botJid = botJidRaw.replace(/:\d+@/, '@')
        const botNum = botJid.replace(/[^0-9]/g, '')
        const botLid = conn.user?.lid ? String(conn.user.lid).replace(/[^0-9]/g, '') : null

        // ─── Resolver LIDs de participantes para comparar correctamente ───
        const resolvedParticipants = await Promise.all(
            participants.map(async (p) => {
                const pJid = String(p.id)
                if (pJid.endsWith('@lid') && conn.lid?.resolve) {
                    try {
                        const resolved = await conn.lid.resolve(pJid)
                        if (resolved) {
                            return { ...p, _resolvedNum: resolved.replace(/[^0-9]/g, '') }
                        }
                    } catch { }
                }
                return { ...p, _resolvedNum: pJid.replace(/[^0-9]/g, '') }
            })
        )

        // ─── Buscar bot en participantes resueltos ───
        const botP = resolvedParticipants.find(p => {
            const pNum = p._resolvedNum
            const pJid = String(p.id).replace(/:\d+@/, '@')
            return pJid === botJid || pNum === botNum || (botLid && pNum === botLid)
        })

        // ─── Buscar usuario (sender) en participantes resueltos ───
        const userP = resolvedParticipants.find(p => p._resolvedNum === senderNum)

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            participants,
            metadata
        }
    } catch (err) {
        console.error('❌ getAdminInfo error:', err.message)
        return { isAdmin: false, isBotAdmin: false, participants: [], metadata: null }
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
// EXTRAE EL ID/COMANDO DE UNA RESPUESTA DE BOTÓN
// Soporta: buttonsResponseMessage, interactiveResponseMessage
// (nativeFlowMessage → quick_reply, single_select, etc.)
// ══════════════════════════════════════════════════════════════════
function extraerIdBoton(m) {
    // ── Botones clásicos ──
    const btnResp = m.message?.buttonsResponseMessage
    if (btnResp?.selectedButtonId) {
        return String(btnResp.selectedButtonId).trim()
    }

    // ── Respuesta de lista (single_select) ──
    const listResp = m.message?.listResponseMessage
    if (listResp?.singleSelectReply?.selectedRowId) {
        return String(listResp.singleSelectReply.selectedRowId).trim()
    }

    // ── Interactive / nativeFlowMessage (quick_reply, single_select nuevo) ──
    const interResp = m.message?.interactiveResponseMessage
    if (interResp) {
        // nativeFlowResponseMessage trae un JSON con "id"
        const nativeRaw = interResp.nativeFlowResponseMessage?.paramsJson
        if (nativeRaw) {
            try {
                const parsed = JSON.parse(nativeRaw)
                // quick_reply → { id: "menu" }
                // single_select → { id: "#menu" }
                if (parsed?.id) return String(parsed.id).trim()
            } catch { }
        }
        // Fallback: selectedButtonId dentro de interactiveResponseMessage
        if (interResp.selectedButtonId) {
            return String(interResp.selectedButtonId).trim()
        }
    }

    // ── templateButtonReplyMessage ──
    const tplResp = m.message?.templateButtonReplyMessage
    if (tplResp?.selectedId) {
        return String(tplResp.selectedId).trim()
    }

    return null
}

// ══════════════════════════════════════════════════════════════════
// HANDLER DE BOTONES
// Reutiliza los permisos ya calculados en el handler principal.
// ══════════════════════════════════════════════════════════════════
async function handleBoton(sock, m, commands, permisos) {
    const rawId = extraerIdBoton(m)
    if (!rawId) return false

    // Limpiar prefijo si lo trae (ej: ".menu" → "menu", "#menu" → "menu")
    const command = rawId.replace(/^[.#\/]/, '').toLowerCase().trim()
    if (!command) return false

    console.log(
        chalk.bgMagenta.white(`\n🎛️  BOTÓN: "${rawId}"`),
        chalk.gray(`→ comando: "${command}"`),
        chalk.cyan(`(R: ${m.sender})`)
    )

    const found = commands.get(command)
    if (!found) {
        console.log(chalk.yellow(`⚠️  Sin plugin para botón: "${command}"`))
        return false
    }

    const { plugin, filePath } = found
    const relativo = path.relative(path.join(process.cwd(), 'src', 'commands'), filePath)
    const { isOwner, isAdmin, isBotAdmin, isGroup, groupMetadata, participants, fromMe } = permisos

    // ── Verificar permisos (mismo orden que el handler principal) ──
    if (plugin.owner    && !isOwner)    { await dfail('owner',    m, sock);    return true }
    if (plugin.group    && !isGroup)    { await dfail('group',    m, sock);    return true }
    if (plugin.private  && isGroup)     { await dfail('private',  m, sock);    return true }
    if (plugin.admin    && !isAdmin)    { await dfail('admin',    m, sock);    return true }
    if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, sock);    return true }

    console.log(
        chalk.bgMagenta.white(`⚡ EJECUTANDO BOTÓN → ${command}`),
        chalk.gray(`[${relativo}]`)
    )

    try {
        await plugin(m, {
            conn: sock,
            args: [],
            usedPrefix: global.prefix || '.',
            isOwner,
            command,
            isGroup,
            isAdmin,
            isBotAdmin,
            groupMetadata,
            participants,
            fromMe,
            text: ''
        })
    } catch (err) {
        registrarError(relativo, command, m.sender, err)
        const errorMsg = global.msj?.error || '❌ Error al ejecutar el comando.'
        try { await sock.sendMessage(m.chat, { text: errorMsg }, { quoted: m }) } catch { }
    }

    return true
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

        // Resolución de IDs tipo LID
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

        // Print en consola
        try {
            const { printMensaje } = await import('./print.js')
            if (!fromMe) printMensaje(m, sock)
        } catch { }

        // ── Calcular permisos UNA vez ──
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
        }

        // Inyectar propiedades base (necesarias también para handleBoton)
        m.chat      = from
        m.sender    = senderJid
        m.timestamp = Date.now()
        m.isGroup   = isGroup
        m.isAdmin   = isAdmin
        m.isBotAdmin = isBotAdmin
        m.isOwner   = isOwner
        m.text      = text

        // ── Anti-Link ──
        try {
            const { antilinkDetector } = await import('../src/commands/funciones/antilink-detector.js')
            const blocked = await antilinkDetector(sock, m)
            if (blocked) return
        } catch { }

        // ── Anti-Master ──
        try {
            const { antiMasterDetector } = await import('../src/commands/funciones/anti-master.js')
            const blocked = await antiMasterDetector(sock, m, { isBotAdmin, isAdmin })
            if (blocked) return
        } catch { }

        // ── Detección de botones ──
        // Se lanza ANTES del bloque de comandos de texto para que quick_reply,
        // single_select y buttonsResponse sean interceptados aquí.
        const esTipoBoton = [
            'buttonsResponseMessage',
            'interactiveResponseMessage',
            'listResponseMessage',
            'templateButtonReplyMessage'
        ].includes(tipo)

        if (esTipoBoton) {
            const permisos = { isOwner, isAdmin, isBotAdmin, isGroup, groupMetadata, participants, fromMe }
            const manejado = await handleBoton(sock, m, commands, permisos)
            // Si fue manejado (o no había plugin) no seguimos al bloque de texto
            return
        }

        // ── Procesamiento de comandos de texto ──
        if (!text || !text.startsWith(usedPrefix)) return

        const args = text.slice(usedPrefix.length).trim().split(/\s+/)
        const command = args.shift()?.toLowerCase()
        if (!command) return

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
            chalk.gray(`botAdmin: ${isBotAdmin} | admin: ${isAdmin} | owner: ${isOwner}`),
            chalk.gray(`args: [${args.join(', ')}]`)
        )

        // ── Verificar permisos ──
        if (plugin.owner    && !isOwner)    { await dfail('owner',    m, sock);        return }
        if (plugin.group    && !isGroup)    { await dfail('group',    m, sock);        return }
        if (plugin.private  && isGroup)     { await dfail('private',  m, sock);        return }
        if (plugin.admin    && !isAdmin)    { await dfail('admin',    m, sock);        return }
        if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, sock);        return }

        // ── Ejecutar plugin ──
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