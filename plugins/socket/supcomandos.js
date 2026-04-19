import fs from 'fs'
import path from 'path'
import { isPremium, normalize } from '../../lib/premium.js'

const SUBBOT_FOLDER = './sessions/subbots'

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
    
    // Limpiar todas las referencias
    if (global.subBots) {
        for (const [key, sock] of global.subBots) {
            if (sock?.userId === userId || sock?.ownerId === userId) {
                global.subBots.delete(key)
            }
        }
    }
}

// Verificación REAL del estado de conexión
function checkRealConnectionStatus(sock) {
    if (!sock) return false
    
    try {
        // Verificar WebSocket
        const wsOpen = sock.ws && (sock.ws.readyState === 1 || sock.ws.readyState === 'OPEN')
        // Verificar usuario autenticado
        const hasUser = sock.user && (sock.user.jid || sock.user.id)
        // Verificar estado de conexión
        const connOpen = sock.connOpen || sock.connection === 'open'
        
        return wsOpen && hasUser
    } catch (e) {
        return false
    }
}

async function listSubBots(m, { conn, usedPrefix, args }) {
    const userId = normalize(m.sender)
    const isPremiumUser = isPremium(m.sender)
    
    if (!global.subBots) global.subBots = new Map()
    if (!global.subBotsData) global.subBotsData = new Map()
    
    const showAll = m.isOwner && args.includes('all')
    const userSubBots = []
    const seenJids = new Set()
    
    // Recopilar sub-bots únicos con verificación real de estado
    for (const [key, data] of global.subBotsData) {
        if (!data?.userId) continue
        
        const ownerNormalized = normalize(data.owner || data.userId)
        const targetJid = data.jid || `${data.userId}@s.whatsapp.net`
        
        if (seenJids.has(targetJid)) continue
        seenJids.add(targetJid)
        
        if (!showAll && ownerNormalized !== userId) continue
        
        // Buscar socket asociado
        let sock = global.subBots.get(data.userId) || 
                   global.subBots.get(targetJid) || 
                   global.subBots.get(key)
        
        // Verificación REAL del estado
        const isConnected = checkRealConnectionStatus(sock)
        
        // Actualizar data si cambió el estado
        if (data.isConnected !== isConnected) {
            data.isConnected = isConnected
            data.lastCheck = Date.now()
            global.subBotsData.set(key, data)
            // Sincronizar en otras keys
            if (data.userId) global.subBotsData.set(data.userId, data)
            if (data.jid) global.subBotsData.set(data.jid, data)
        }
        
        userSubBots.push({
            id: data.userId,
            name: data.name || 'SubBot',
            jid: targetJid,
            connectedAt: data.connectedAt || Date.now(),
            isConnected: isConnected,
            owner: data.owner || data.userId,
            isPremium: isPremium(data.owner || data.userId),
            lastCheck: data.lastCheck || Date.now()
        })
    }

    if (userSubBots.length === 0) {
        return conn.sendMessage(m.chat, { 
            text: '📭 No tienes sub-bots.\nUsa *.qr* o *.code* para crear.' 
        }, { quoted: m })
    }

    let txt = `🤖 *${showAll ? 'TODOS LOS SUB-BOTS' : 'TUS SUB-BOTS'}*\n\n`
    
    userSubBots.forEach((bot, i) => {
        const status = bot.isConnected ? '🟢 Conectado' : '🔴 Desconectado'
        const premiumBadge = bot.isPremium ? '👑' : '👤'
        txt += `${i + 1}. ${premiumBadge} *${bot.name}*\n`
        txt += `   📱 ${bot.id}\n`
        txt += `   📊 ${status}\n`
        if (showAll) txt += `   👤 Owner: +${bot.owner}\n`
        txt += `   🕐 ${new Date(bot.connectedAt).toLocaleDateString()}\n\n`
    })
    
    txt += `📊 Total: ${userSubBots.length}\n`
    txt += isPremiumUser ? '👑 Premium (máx 5)\n' : '👤 Normal (máx 1)\n'
    txt += `\n📌 *Comandos:*\n`
    txt += `${usedPrefix}delsub <id> - Eliminar\n`
    txt += `${usedPrefix}restartsub <id> - Reiniciar`

    await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
}

async function deleteSubBot(m, { conn, args, usedPrefix }) {
    const userId = normalize(m.sender)
    const targetId = args[0] ? normalize(args[0]) : userId

    // Buscar en todas las keys posibles
    let targetData = null
    let targetSock = null
    
    for (const [key, data] of global.subBotsData || []) {
        if (normalize(data?.userId) === targetId || normalize(data?.owner) === targetId) {
            targetData = data
            targetSock = global.subBots.get(key) || global.subBots.get(data.userId) || global.subBots.get(data.jid)
            break
        }
    }
    
    if (!targetData && !targetSock) {
        return conn.sendMessage(m.chat, { 
            text: `❌ Sub-bot ${targetId} no encontrado` 
        }, { quoted: m })
    }

    const ownerId = targetData?.owner ? normalize(targetData.owner) : null
    if (ownerId && ownerId !== userId && !m.isOwner) {
        return conn.sendMessage(m.chat, { text: '❌ No te pertenece.' }, { quoted: m })
    }

    try {
        if (targetSock?.ws) targetSock.ws.close()
        targetSock?.ev?.removeAllListeners()
    } catch (e) {}

    const sessionPath = path.join(SUBBOT_FOLDER, targetId)
    await cleanupSession(sessionPath, targetId)

    await conn.sendMessage(m.chat, { 
        text: `✅ Sub-bot *${targetId}* eliminado.` 
    }, { quoted: m })
}

async function killAllSubBots(m, { conn }) {
    if (!m.isOwner) {
        return conn.sendMessage(m.chat, { text: '❌ Solo owner.' }, { quoted: m })
    }

    if (!global.subBots || global.subBots.size === 0) {
        return conn.sendMessage(m.chat, { text: '📭 No hay sub-bots.' }, { quoted: m })
    }

    const closedSocks = new Set()
    let count = 0
    
    for (const [key, sock] of global.subBots) {
        if (closedSocks.has(sock)) continue
        closedSocks.add(sock)
        count++
        
        try {
            sock.ev?.removeAllListeners()
            if (sock.ws) sock.ws.close()
        } catch (e) {}
        
        if (sock.userId) {
            const sessionPath = path.join(SUBBOT_FOLDER, sock.userId)
            await cleanupSession(sessionPath, sock.userId)
        }
    }

    global.subBots.clear()
    global.subBotsData.clear()
    global.sentCodes.clear()
    global.subBotReconnectAttempts?.clear()
    if (global.conns) global.conns = []

    await conn.sendMessage(m.chat, { 
        text: `✅ ${count} sub-bots eliminados.` 
    }, { quoted: m })
}

async function restartSubBot(m, { conn, args, usedPrefix }) {
    const userId = normalize(m.sender)
    const targetId = args[0] ? normalize(args[0]) : userId

    let targetData = null
    let targetSock = null
    
    for (const [key, data] of global.subBotsData || []) {
        if (normalize(data?.userId) === targetId) {
            targetData = data
            targetSock = global.subBots.get(key) || global.subBots.get(data.userId) || global.subBots.get(data.jid)
            break
        }
    }
    
    if (!targetData && !targetSock) {
        return conn.sendMessage(m.chat, { 
            text: `❌ Sub-bot ${targetId} no encontrado` 
        }, { quoted: m })
    }

    const ownerId = targetData?.owner ? normalize(targetData.owner) : null
    if (ownerId && ownerId !== userId && !m.isOwner) {
        return conn.sendMessage(m.chat, { text: '❌ No te pertenece.' }, { quoted: m })
    }

    await conn.sendMessage(m.chat, { 
        text: `🔄 Reiniciando *${targetId}*...` 
    }, { quoted: m })

    try {
        targetSock.ev?.removeAllListeners()
        if (targetSock.ws) targetSock.ws.close()
    } catch (e) {}

    // Limpiar referencias
    global.subBots.delete(targetId)
    global.subBotsData.delete(targetId)
    if (targetData?.jid) {
        global.subBots.delete(targetData.jid)
        global.subBotsData.delete(targetData.jid)
    }

    await delay(2000)

    const sessionPath = path.join(SUBBOT_FOLDER, targetId)
    const { createSubBot } = await import('./serbot.js')
    
    await createSubBot({
        sessionPath,
        m,
        conn,
        usedPrefix,
        userId: targetId,
        isAutoStart: true,
        mcode: false
    })

    await conn.sendMessage(m.chat, { 
        text: `✅ Sub-bot *${targetId}* reiniciado.` 
    }, { quoted: m })
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    switch (command) {
        case 'listsub':
        case 'listsubs':
        case 'listbots':
        case 'misbots':
            await listSubBots(m, { conn, usedPrefix, args })
            break
            
        case 'delsub':
        case 'killsub':
        case 'delbot':
            if (!args[0]) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Especifica ID: ${usedPrefix}delsub 521XXXXXXXXXX` 
                }, { quoted: m })
            }
            await deleteSubBot(m, { conn, args, usedPrefix })
            break
            
        case 'restartsub':
        case 'restartbot':
            if (!args[0]) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Especifica ID: ${usedPrefix}restartsub 521XXXXXXXXXX` 
                }, { quoted: m })
            }
            await restartSubBot(m, { conn, args, usedPrefix })
            break
            
        case 'killallsub':
        case 'killallbots':
        case 'delallbots':
            await killAllSubBots(m, { conn, usedPrefix })
            break
    }
}

handler.help = ['listsub', 'delsub', 'restartsub', 'killallsub']
handler.tags = ['serbot']
handler.command = ['listsub', 'listsubs', 'delsub', 'killsub', 'restartsub', 'restartbot', 'killallsub', 'listbots', 'delbot', 'killallbots', 'misbots', 'delallbots']

export default handler