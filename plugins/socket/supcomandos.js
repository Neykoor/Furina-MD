import fs from 'fs'
import path from 'path'

const SUBBOT_FOLDER = './sessions/subbots'

function normalize(num) {
    return String(num).replace(/[^0-9]/g, '')
}

async function cleanupSession(sessionPath, userId) {
    try {
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }
    } catch (e) {
        console.error('Error eliminando sesión:', e)
    }
    global.subBots?.delete(userId)
    global.subBotsData?.delete(userId)
    global.sentCodes?.delete(userId)
    global.subBotReconnectAttempts?.delete(userId)
}

async function listSubBots(m, { conn, usedPrefix }) {
    const userId = normalize(m.sender)
    const userSubBots = []
    
    if (!global.subBots || !global.subBotsData) {
        return conn.sendMessage(m.chat, { 
            text: '📭 No tienes sub-bots activos.\n\nUsa *.qr* o *.code* para crear uno.' 
        }, { quoted: m })
    }
    
    for (const [id, sock] of global.subBots) {
        const data = global.subBotsData.get(id)
        if (data?.owner && normalize(data.owner) === userId) {
            userSubBots.push({
                id,
                name: sock.user?.name || 'SubBot',
                jid: sock.user?.jid || 'Desconectado',
                connectedAt: data.connectedAt
            })
        }
    }

    if (userSubBots.length === 0) {
        return conn.sendMessage(m.chat, { 
            text: '📭 No tienes sub-bots activos.\n\nUsa *.qr* o *.code* para crear uno.' 
        }, { quoted: m })
    }

    let txt = `🤖 *TUS SUB-BOTS ACTIVOS*\n\n`
    userSubBots.forEach((bot, i) => {
        txt += `${i + 1}. *${bot.name}*\n`
        txt += `   📱 ID: ${bot.id}\n`
        txt += `   📞 JID: ${bot.jid.split('@')[0]}\n`
        txt += `   🕐 Conectado: ${new Date(bot.connectedAt).toLocaleString()}\n\n`
    })
    txt += `📌 *Comandos:*\n`
    txt += `• ${usedPrefix}delsub <id> - Eliminar sub-bot\n`
    txt += `• ${usedPrefix}restartsub <id> - Reiniciar sub-bot`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

async function deleteSubBot(m, { conn, args, usedPrefix }) {
    const userId = normalize(m.sender)
    const targetId = args[0] ? normalize(args[0]) : userId

    const sock = global.subBots?.get(targetId)
    if (!sock) {
        return conn.sendMessage(m.chat, { 
            text: `❌ No se encontró el sub-bot con ID: ${targetId}` 
        }, { quoted: m })
    }

    const data = global.subBotsData?.get(targetId)
    if (data?.owner && normalize(data.owner) !== userId && !m.isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '❌ Este sub-bot no te pertenece.' 
        }, { quoted: m })
    }

    try {
        if (sock.ws) sock.ws.close()
    } catch (e) {}

    const sessionPath = path.join(SUBBOT_FOLDER, targetId)
    await cleanupSession(sessionPath, targetId)

    await conn.sendMessage(m.chat, { 
        text: `✅ Sub-bot *${targetId}* eliminado correctamente.` 
    }, { quoted: m })
}

async function killAllSubBots(m, { conn, usedPrefix }) {
    if (!m.isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '❌ Solo el owner puede usar este comando.' 
        }, { quoted: m })
    }

    if (!global.subBots || global.subBots.size === 0) {
        return conn.sendMessage(m.chat, { 
            text: '📭 No hay sub-bots activos.' 
        }, { quoted: m })
    }

    const count = global.subBots.size
    
    for (const [id, sock] of global.subBots) {
        try {
            if (sock.ws) sock.ws.close()
        } catch (e) {}
        const sessionPath = path.join(SUBBOT_FOLDER, id)
        await cleanupSession(sessionPath, id)
    }

    global.subBots.clear()
    global.subBotsData.clear()
    global.sentCodes.clear()
    global.subBotReconnectAttempts.clear()

    await conn.sendMessage(m.chat, { 
        text: `✅ *${count}* sub-bots eliminados correctamente.` 
    }, { quoted: m })
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    switch (command) {
        case 'listsub':
        case 'listsubs':
        case 'listbots':
            await listSubBots(m, { conn, usedPrefix })
            break
            
        case 'delsub':
        case 'killsub':
        case 'delbot':
            if (!args[0]) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Especifica el ID del sub-bot\n\nEjemplo: ${usedPrefix}delsub 521XXXXXXXXXX` 
                }, { quoted: m })
            }
            await deleteSubBot(m, { conn, args, usedPrefix })
            break
            
        case 'killallsub':
        case 'killallbots':
            await killAllSubBots(m, { conn, usedPrefix })
            break
    }
}

handler.help = ['listsub', 'delsub', 'killallsub', 'listbots']
handler.tags = ['serbot']
handler.command = ['listsub', 'listsubs', 'delsub', 'killsub', 'killallsub', 'listbots', 'delbot', 'killallbots']

export default handler
