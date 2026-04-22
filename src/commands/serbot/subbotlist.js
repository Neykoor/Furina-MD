import fs from 'fs'
import path from 'path'

const SUBBOT_FOLDER = './data/sessions/subbots'

function checkRealConnectionStatus(sock) {
    if (!sock) return false
    try {
        const wsOpen = sock.ws && (sock.ws.readyState === 1 || sock.ws.readyState === 'OPEN')
        const hasUser = sock.user && (sock.user.jid || sock.user.id)
        return wsOpen && hasUser
    } catch (e) {
        return false
    }
}

function getNum(jid) {
    return String(jid).replace(/[^0-9]/g, '')
}

function getSubBotInfo(sock) {
    try {
        const userName = sock.user?.name || 'Sin nombre'
        const userJid = sock.user?.jid || sock.user?.id || 'Desconocido'
        const userNumber = userJid.split('@')[0]
        const wsReady = checkRealConnectionStatus(sock)

        return {
            name: userName,
            jid: userJid,
            number: userNumber,
            connected: wsReady,
            owner: sock.ownerId || 'Desconocido'
        }
    } catch (e) {
        return null
    }
}

let handler = async (m, { conn, command }) => {
    const from = m.chat

    const isOwner = global.owner && global.owner.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    const showAll = isOwner && (command === 'allbots' || command === 'listall')

    if (!global.subBots || global.subBots.size === 0) {
        return conn.sendMessage(from, {
            text: '📭 *No hay sub-bots conectados.*\n\nUsa *.qr* o *.code* para crear uno.'
        }, { quoted: m })
    }

    let txt = ''
    let count = 0

    if (showAll) {
        txt += `🤖 *TODOS LOS SUB-BOTS*\n\n`
    } else {
        txt += `🤖 *MIS SUB-BOTS*\n\n`
    }

    const seenJids = new Set()
    const userId = getNum(m.sender)

    for (const [key, sock] of global.subBots) {
        try {
            if (!sock?.user) continue

            const info = getSubBotInfo(sock)
            if (!info) continue

            if (seenJids.has(info.jid)) continue
            seenJids.add(info.jid)

            if (!showAll && info.owner !== userId) continue

            count++

            const status = info.connected ? '🟢 Conectado' : '🔴 Desconectado'
            const ownerTag = showAll ? `\n   👤 Owner: +${info.owner}` : ''

            txt += `${count}. *${info.name}*\n`
            txt += `   📱 +${info.number}\n`
            txt += `   📊 ${status}${ownerTag}\n\n`

        } catch (e) { continue }
    }

    if (count === 0) {
        return conn.sendMessage(from, {
            text: '📭 *No tienes sub-bots conectados.*\n\nUsa *.qr* o *.code* para crear uno.'
        }, { quoted: m })
    }

    txt += `📊 *Total:* ${count} sub-bot${count !== 1 ? 's' : ''}\n\n`

    if (!showAll && isOwner) {
        txt += `👑 Usa *.allbots* para ver todos.`
    }

    await conn.sendMessage(from, { text: txt.trim() }, { quoted: m })
}

handler.help = ['bots', 'listbots', 'misbots', 'allbots']
handler.tags = ['serbot']
handler.command = ['bots', 'listbots', 'misbots', 'allbots']

export default handler;