import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import NodeCache from 'node-cache'

const erroresRuntimeFile = path.join(process.cwd(), 'data', 'errores-runtime.json')
const groupCache = new NodeCache({ stdTTL: 25 })

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

function getTipoMensaje(msg) {
    if (!msg?.message) return null
    const tipos = [
        'conversation', 'imageMessage', 'videoMessage', 'audioMessage',
        'stickerMessage', 'documentMessage', 'extendedTextMessage',
        'reactionMessage', 'locationMessage', 'contactMessage',
        'pollCreationMessage', 'buttonsResponseMessage', 'listResponseMessage',
        'templateButtonReplyMessage', 'interactiveResponseMessage'
    ]
    for (const tipo of tipos) {
        if (msg.message?.[tipo]) return tipo
    }
    return null
}

function checkOwner(sender) {
    const num = String(sender).replace(/[^0-9]/g, '')
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => {
        const ownerNum = String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '')
        return ownerNum === num
    })
}

async function getAdminInfo(conn, groupJid, senderJid) {
    try {
        let metadata = groupCache.get(groupJid)
        if (!metadata) {
            metadata = await conn.groupMetadata(groupJid)
            groupCache.set(groupJid, metadata)
        }
        const participants = metadata.participants || []
        const senderNum = String(senderJid).replace(/[^0-9]/g, '')
        const botJid = conn.user?.id || conn.user?.jid || ''
        const botNum = String(botJid).replace(/[^0-9]/g, '')
        const botLid = conn.user?.lid ? String(conn.user.lid).replace(/[^0-9]/g, '') : null

        const botP = participants.find(p => {
            const pNum = String(p.id).replace(/[^0-9]/g, '')
            return pNum === botNum || (botLid && pNum === botLid)
        })
        const userP = participants.find(p => String(p.id).replace(/[^0-9]/g, '') === senderNum)

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            participants,
            metadata
        }
    } catch (e) {
        return { isAdmin: false, isBotAdmin: false, participants: [], metadata: null }
    }
}

// SISTEMA DE MENSAJES DE ERROR DE PERMISOS
async function dfail(tipo, m, conn, cmd = '') {
    const mensajes = {
        owner: '👑 Este comando es solo para *owners*.',
        group: '👥 Este comando solo funciona en *grupos*.',
        private: '👤 Este comando solo funciona en *privado*.',
        admin: '🛡️ Necesitas ser *administrador* del grupo.',
        botAdmin: '🤖 Necesito ser *administrador* para ejecutar esto.',
        invalid: `❌ El comando *${cmd}* no existe.`
    }

    let textoBase = mensajes[tipo] || '🚫 Sin permiso.'
    if (tipo === 'invalid' && global.msj?.validcommand) {
        textoBase = global.msj.validcommand.replace('${cmd}', cmd)
    }

    const chatId = m.key?.remoteJid || m.chat
    const channelLink = global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
    const emoji = { owner: '👑', group: '👥', private: '👤', admin: '🛡️', botAdmin: '🤖', invalid: '' }[tipo] || '🚫'
    let mensajeFinal = tipo !== 'invalid' ? `${emoji} ${textoBase}` : textoBase

    let logoBuffer = global.botLogoCache
    if (!logoBuffer && global.icono) {
        try {
            const res = await fetch(global.icono)
            logoBuffer = Buffer.from(await res.arrayBuffer())
            global.botLogoCache = logoBuffer
        } catch (e) {
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
        try {
            await conn.sendMessage(chatId, { text: mensajeFinal })
        } catch { }
    }
}

// RESPUESTA A SELECCIÓN DE LISTA (para el menú)
async function handleListResponse(sock, m, commands) {
    try {
        const selected = m.message?.listResponseMessage?.title ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson

        if (!selected) return false

        let command = ''
        if (selected.startsWith('.')) {
            command = selected.slice(1).split(' ')[0]
        } else if (selected.includes('Menú Gacha')) {
            command = 'gacha'
        } else if (selected.includes('Menú Grupo')) {
            command = 'grupo'
        } else if (selected.includes('Menú Antilinks')) {
            command = 'antilinks'
        } else if (selected.includes('Menú RPG')) {
            command = 'rpg'
        } else if (selected.includes('Menú Games')) {
            command = 'games'
        } else if (selected.includes('Configurar')) {
            command = 'config'
        } else if (selected.includes('Reiniciar')) {
            command = 'restartbot'
        }

        if (command && commands.has(command)) {
            const { plugin } = commands.get(command)
            const fakeM = {
                ...m,
                text: `.${command}`,
                sender: m.key.participant || m.key.remoteJid
            }

            // Verificar permisos antes de ejecutar
            const from = m.key.remoteJid
            const senderJid = m.key.participant || from
            const isGroup = from.endsWith('@g.us')
            const isOwner = checkOwner(senderJid)

            let isAdmin = false
            let isBotAdmin = false

            if (isGroup) {
                const info = await getAdminInfo(sock, from, senderJid)
                isAdmin = info.isAdmin
                isBotAdmin = info.isBotAdmin
            }

            if (plugin.owner && !isOwner) {
                await dfail('owner', fakeM, sock);
                return true;
            }
            if (plugin.group && !isGroup) {
                await dfail('group', fakeM, sock);
                return true;
            }
            if (plugin.private && isGroup) {
                await dfail('private', fakeM, sock);
                return true;
            }
            if (plugin.admin && !isAdmin) {
                await dfail('admin', fakeM, sock);
                return true;
            }
            if (plugin.botAdmin && !isBotAdmin) {
                await dfail('botAdmin', fakeM, sock);
                return true;
            }

            await plugin(fakeM, {
                conn: sock,
                args: [],
                usedPrefix: '.',
                isOwner,
                command,
                isGroup,
                isAdmin,
                isBotAdmin,
                fromMe: false,
                text: ''
            })
            return true
        }
    } catch (e) {
        console.log('Error en list response:', e.message)
    }
    return false
}

export async function handleMessage(sock, m, commands) {
    try {
        if (!sock || !m) return

        const tipo = getTipoMensaje(m)
        if (!tipo) return

        // Manejar respuesta de lista primero
        if (tipo === 'listResponseMessage' || tipo === 'interactiveResponseMessage') {
            const handled = await handleListResponse(sock, m, commands)
            if (handled) return
        }

        const from = m.key.remoteJid
        let senderJid = m.key.participant || from

        if (sock.lid && senderJid.endsWith('@lid')) {
            const resuelto = await sock.lid.resolve(senderJid)
            if (resuelto) {
                senderJid = resuelto
            }
        }

        const isGroup = from.endsWith('@g.us')
        const fromMe = m.key?.fromMe || false
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

        if (!text || !text.startsWith(usedPrefix)) return

        const args = text.slice(usedPrefix.length).trim().split(/\s+/)
        const command = args.shift()?.toLowerCase()
        if (!command) return

        const isOwner = checkOwner(senderJid)

        let isAdmin = false
        let isBotAdmin = false
        let groupMetadata = null
        let participants = []

        if (isGroup) {
            const info = await getAdminInfo(sock, from, senderJid)
            isAdmin = info.isAdmin
            isBotAdmin = info.isBotAdmin
            groupMetadata = info.metadata
            participants = info.participants
        }

        m.chat = from
        m.sender = senderJid
        m.timestamp = Date.now()
        m.isGroup = isGroup
        m.isAdmin = isAdmin
        m.isBotAdmin = isBotAdmin
        m.isOwner = isOwner
        m.text = text

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

        // VERIFICAR PERMISOS ANTES DE EJECUTAR
        if (plugin.owner && !isOwner) {
            await dfail('owner', m, sock);
            return;
        }
        if (plugin.group && !isGroup) {
            await dfail('group', m, sock);
            return;
        }
        if (plugin.private && isGroup) {
            await dfail('private', m, sock);
            return;
        }
        if (plugin.admin && !isAdmin) {
            await dfail('admin', m, sock);
            return;
        }
        if (plugin.botAdmin && !isBotAdmin) {
            await dfail('botAdmin', m, sock);
            return;
        }

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
            try {
                await sock.sendMessage(from, { text: errorMsg }, { quoted: m })
            } catch { }
        }

    } catch (error) { }
}