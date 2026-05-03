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
function getPureNumber(jid) {
    if (!jid) return ''
    return String(jid).replace(/[^0-9]/g, '')
}

// ══════════════════════════════════════════════════════════════════
function isSameJid(jid1, jid2) {
    if (!jid1 || !jid2) return false
    const n1 = getPureNumber(jid1)
    const n2 = getPureNumber(jid2)
    return n1.length > 5 && n1 === n2
}

// ══════════════════════════════════════════════════════════════════
function getBotJid(sock) {
    const candidates = []
    if (sock.user?.id) candidates.push(sock.user.id)
    if (sock.user?.jid) candidates.push(sock.user.jid)
    if (sock.authState?.creds?.me?.id) candidates.push(sock.authState.creds.me.id)
    if (sock.ws?.config?.jid) candidates.push(sock.ws.config.jid)
    if (sock.user?.lid) candidates.push(sock.user.lid)
    return candidates.filter(Boolean)
}

// ══════════════════════════════════════════════════════════════════
// RESOLVE LID: Convierte JID normal a LID usando la API de Baileys
// ══════════════════════════════════════════════════════════════════
async function resolveLid(sock, jid) {
    try {
        if (!jid) return null
        // Si ya es LID, devolverlo
        if (jid.endsWith('@lid')) return jid
        // Intentar resolver via sock.lid
        if (sock.lid?.resolve) {
            const resolved = await sock.lid.resolve(jid)
            if (resolved) return resolved
        }
        // Fallback: buscar en el store de Baileys
        if (sock.store?.contacts) {
            const contact = Object.values(sock.store.contacts).find(c =>
                c.id && isSameJid(c.id, jid) && c.lid
            )
            if (contact?.lid) return contact.lid
        }
        return null
    } catch {
        return null
    }
}

// ══════════════════════════════════════════════════════════════════
// Obtiene permisos del grupo con cache
// ══════════════════════════════════════════════════════════════════
async function getAdminInfo(conn, groupJid, senderJid) {
    try {
        let metadata = groupCache.get(groupJid)
        if (!metadata) {
            metadata = await conn.groupMetadata(groupJid)
            groupCache.set(groupJid, metadata)
        }

        const participants = metadata.participants || []
        const botJids = getBotJid(conn)

        // 🔧 Limpiar sufijo de dispositivo (:12) de los JIDs del bot
        const cleanBotJids = botJids.map(j => j.replace(/(:\d+)(?=@)/, ''))

        // RESOLVER LIDs del bot para comparar con participants LID
        const botLids = []
        for (const jid of cleanBotJids) {
            const lid = await resolveLid(conn, jid)
            if (lid) botLids.push(lid)
        }
        // Combinar JIDs limpios + LIDs resueltos
        const allBotIds = [...cleanBotJids, ...botLids]

        // Buscar al bot en participants (por JID normal o LID)
        let botP = null
        for (const candidate of allBotIds) {
            botP = participants.find(p => isSameJid(p.id, candidate))
            if (botP) break
        }

        // Fallback por número puro
        if (!botP) {
            for (const candidate of allBotIds) {
                const pureNum = getPureNumber(candidate)
                botP = participants.find(p => getPureNumber(p.id) === pureNum)
                if (botP) break
            }
        }

        // Resolver LID del sender también
        const senderLid = await resolveLid(conn, senderJid)
        const allSenderIds = [senderJid]
        if (senderLid) allSenderIds.push(senderLid)

        // Buscar al sender
        let userP = null
        for (const candidate of allSenderIds) {
            userP = participants.find(p => isSameJid(p.id, candidate))
            if (userP) break
        }

        // DEBUG
        console.log(chalk.yellow('[DEBUG getAdminInfo]'))
        console.log('  botJids limpios:', cleanBotJids)
        console.log('  botLids resueltos:', botLids)
        console.log('  botP:', botP ? { id: botP.id, admin: botP.admin } : 'NO ENCONTRADO')
        console.log('  senderJid:', senderJid)
        console.log('  senderLid resuelto:', senderLid || 'N/A')
        console.log('  userP:', userP ? { id: userP.id, admin: userP.admin } : 'NO ENCONTRADO')
        console.log('  participants sample:', participants.slice(0, 3).map(p => ({ id: p.id, admin: p.admin })))

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            participants,
            metadata
        }
    } catch (err) {
        console.error(chalk.red('[getAdminInfo Error]'), err.message)
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

        // Resolver LID si está presente
        if (sock.lid && senderJid.endsWith('@lid')) {
            try {
                const resuelto = await sock.lid.resolve(senderJid)
                if (resuelto) senderJid = resuelto
            } catch (e) {
                console.log(chalk.yellow('[LID Resolve Error]'), e.message)
            }
        }

        // 🔧 CORRECCIÓN CLAVE: eliminar sufijo de dispositivo (:12) 
        // Convierte "123456789:12@s.whatsapp.net" → "123456789@s.whatsapp.net"
        senderJid = senderJid.replace(/(:\d+)(?=@)/, '')

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

        try {
            const { antilinkDetector } = await import('../src/commands/funciones/antilink-detector.js')
            const blocked = await antilinkDetector(sock, m)
            if (blocked) return
        } catch { }

        try {
            const { antiMasterDetector } = await import('../src/commands/funciones/anti-master.js')
            const blocked = await antiMasterDetector(sock, m, { isBotAdmin, isAdmin })
            if (blocked) return
        } catch { }

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
            chalk.yellow(`botAdmin: ${isBotAdmin} | admin: ${isAdmin} | owner: ${isOwner}`),
            chalk.gray(`args: [${args.join(', ')}]`)
        )

        if (plugin.owner    && !isOwner)    { await dfail('owner',    m, sock); return }
        if (plugin.group    && !isGroup)    { await dfail('group',    m, sock); return }
        if (plugin.private  && isGroup)     { await dfail('private',  m, sock); return }
        if (plugin.admin    && !isAdmin)    { await dfail('admin',    m, sock); return }
        if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, sock); return }

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