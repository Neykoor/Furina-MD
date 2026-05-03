import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const erroresRuntimeFile = path.join(process.cwd(), 'data', 'errores-runtime.json')
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
// ✅ FUNCIÓN REPARADA - Detección robusta de admin del bot
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
        
        // ✅ REPARADO: Obtener JID del bot de forma robusta
        const botJid = conn.user?.id || conn.user?.jid || conn.user?.lid || ''
        const botNum = String(botJid).replace(/[^0-9]/g, '')
        
        // ✅ REPARADO: También obtener LID si existe
        const botLidRaw = conn.user?.lid || ''
        const botLidNum = String(botLidRaw).replace(/[^0-9]/g, '')

        // ✅ REPARADO: Función helper para normalizar JIDs de participantes
        const normalizeJid = (jid) => {
            if (!jid) return ''
            // Maneja formatos: 123@s.whatsapp.net, 123@lid, 123:123@lid, etc.
            return String(jid).replace(/[^0-9]/g, '')
        }

        // ✅ REPARADO: Buscar al bot en participantes con múltiples fallbacks
        const botP = participants.find(p => {
            const pNum = normalizeJid(p.id)
            // Comparar contra: id normal, jid, o lid
            return pNum === botNum || 
                   (botLidNum && pNum === botLidNum) ||
                   p.id === botJid ||
                   p.id === botLidRaw
        })

        // ✅ REPARADO: Buscar al usuario sender
        const userP = participants.find(p => {
            const pNum = normalizeJid(p.id)
            return pNum === senderNum
        })

        // ✅ DEBUG: Log para verificar (puedes quitar después)
        if (global.debugMode) {
            console.log(chalk.yellow(`[ADMIN DEBUG] Bot JID: ${botJid} | Num: ${botNum} | LID: ${botLidRaw}`))
            console.log(chalk.yellow(`[ADMIN DEBUG] Bot encontrado: ${botP ? 'SÍ' : 'NO'} | Admin: ${botP?.admin || 'N/A'}`))
        }

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            participants,
            metadata
        }
    } catch (err) {
        // ✅ REPARADO: Log del error real para debugging
        console.error(chalk.red('[getAdminInfo ERROR]'), err.message)
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

        try {
            const { printMensaje } = await import('./print.js')
            if (!fromMe) printMensaje(m, sock)
        } catch { }

        // ── Calcular permisos ──
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

        // ── Comandos ──
        if (!text || !text.startsWith(usedPrefix)) return

        const args = text.slice(usedPrefix.length).trim().split(/\s+/)
        const command = args.shift()?.toLowerCase()
        if (!command) return

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

        // ── Verificar permisos ──
        if (plugin.owner    && !isOwner)    { await dfail('owner',    m, sock);        return }
        if (plugin.group    && !isGroup)    { await dfail('group',    m, sock);        return }
        if (plugin.private  && isGroup)     { await dfail('private',  m, sock);        return }
        if (plugin.admin    && !isAdmin)    { await dfail('admin',    m, sock);        return }
        if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, sock);        return }

        // ── Ejecutar ──
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
