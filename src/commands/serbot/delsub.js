import fs from 'fs'
import path from 'path'

const SUBBOT_FOLDER = './data/sessions/subbots'

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getNum(jid) {
    return String(jid).replace(/[^0-9]/g, '')
}

async function cleanupSession(sessionPath, userId) {
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }
    } catch (e) {}

    global.subBots?.delete(userId)
    global.subBotsData?.delete(userId)
    global.sentCodes?.delete(userId)
    global.subBotReconnectAttempts?.delete(userId)

    if (global.subBots) {
        for (const [key, sock] of global.subBots) {
            if (sock?.userId === userId || sock?.ownerId === userId) {
                try {
                    sock.ev?.removeAllListeners()
                    if (sock.ws) sock.ws.close()
                } catch (e) {}
                global.subBots.delete(key)
            }
        }
    }
}

let handler = async (m, { conn, args, usedPrefix }) => {
    const from = m.chat
    const userId = getNum(m.sender)

    const isOwner = global.owner && global.owner.some(o => {
        const id = Array.isArray(o) ? o[0] : o
        return id === m.sender
    })

    let targetId = args[0] ? getNum(args[0]) : userId

    if (!isOwner && targetId !== userId) {
        return conn.sendMessage(from, { 
            text: '❌ Solo puedes eliminar tus propios sub-bots.' 
        }, { quoted: m })
    }

    let targetSock = null
    let targetData = null

    for (const [key, sock] of global.subBots || []) {
        if (getNum(key) === targetId) {
            targetSock = sock
            targetData = global.subBotsData?.get(key)
            break
        }
    }

    if (!targetSock) {
        for (const [key, data] of global.subBotsData || []) {
            if (getNum(data?.userId) === targetId || getNum(data?.owner) === targetId) {
                targetData = data
                targetSock = global.subBots.get(key)
                break
            }
        }
    }

    if (!targetSock && !targetData) {
        const sessionPath = path.join(SUBBOT_FOLDER, targetId)
        if (fs.existsSync(sessionPath)) {
            await cleanupSession(sessionPath, targetId)
            return conn.sendMessage(from, { 
                text: `✅ Sesión de *${targetId}* eliminada (no estaba conectado).` 
            }, { quoted: m })
        }

        return conn.sendMessage(from, { 
            text: `❌ Sub-bot *${targetId}* no encontrado.\n\nUsa *${usedPrefix}bots* para ver los disponibles.` 
        }, { quoted: m })
    }

    try {
        if (targetSock?.ev) targetSock.ev.removeAllListeners()
        if (targetSock?.ws) targetSock.ws.close()
    } catch (e) {}

    const sessionPath = path.join(SUBBOT_FOLDER, targetId)
    await cleanupSession(sessionPath, targetId)

    await conn.sendMessage(from, { 
        text: `✅ Sub-bot *${targetId}* eliminado correctamente.` 
    }, { quoted: m })
}

handler.help = ['delsub', 'delbot', 'killsub']
handler.tags = ['serbot']
handler.command = ['delsub', 'delbot', 'killsub']

export default handler
