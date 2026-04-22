import fetch from 'node-fetch'
import path from 'path'
import fs from 'fs'

async function getRcanal() {
    try {
        const thumb = Buffer.from(await (await fetch(global.icono)).arrayBuffer())
        return {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.IDchannel || '120363399175402285@newsletter',
                serverMessageId: '',
                newsletterName: global.namebot || '『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』'
            },
            externalAdReply: {
                title: global.namebot || 'ᴀsᴛᴀ-ʙᴏᴛ',
                body: global.dev || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴇʀɴᴀɴᴅᴏ',
                mediaType: 1,
                sourceUrl: global.channel || '',
                thumbnail: thumb,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: false
            }
        }
    } catch { return {} }
}

let handler = async (m, { conn }) => {
    const from = m.chat

    const { getSubConfig, cleanNum } = await import('./serbot.js')
    const userId = cleanNum(conn.userId || conn.user?.jid)
    const subConfig = conn.subConfig || getSubConfig(userId)

    if (!conn.isSubBot) {
        return conn.sendMessage(from, {
            text: `❌ Este comando solo funciona en *Sub-Bots*.\nUsa *.qr* o *.code* para vincular uno.`
        }, { quoted: m })
    }

    const senderNum = cleanNum(m.sender)
    const ownerNum = cleanNum(conn.ownerId || subConfig.owner)
    const isGlobalOwner = (global.owner || []).some(o =>
        cleanNum(Array.isArray(o) ? o[0] : o) === senderNum
    )

    if (senderNum !== ownerNum && !isGlobalOwner) {
        return conn.sendMessage(from, {
            text: `🔒 Solo el *owner* de este Sub-Bot puede ver esta información.`
        }, { quoted: m })
    }

    const botName = global.namebot || conn.user?.name || 'Asta Bot'
    const botNum = userId
    const ownerDisp = cleanNum(subConfig.owner || ownerNum)
    const modo = subConfig.mode === 'private' ? '🔐 Privado' : '🔓 Público'
    const antiPriv = subConfig.antiPrivate ? '✅ On' : '❌ Off'
    const antiSpam = subConfig.antiSpam ? '✅ On' : '❌ Off'
    const cooldown = subConfig.cooldown ?? 3000
    const logo = subConfig.logoUrl ? '🔗 URL personalizado' : '🖼️ Por defecto'
    const createdAt = subConfig.createdAt
        ? new Date(subConfig.createdAt).toLocaleDateString('es-MX') : 'N/A'

    const ws = conn.ws?.readyState
    const wsEmoji = ws === 1 ? '🟢' : ws === 0 ? '🟡' : '🔴'
    const wsLabel = ws === 1 ? 'Conectado' : ws === 0 ? 'Conectando' : 'Desconectado'

    const botData = global.subBotsData?.get(userId) || global.subBotsData?.get(conn.user?.jid)
    const connDate = botData?.connectedAt
        ? new Date(botData.connectedAt).toLocaleString('es-MX', { hour12: false })
        : 'N/A'

    const uptime = process.uptime()
    const uptimeStr = [
        Math.floor(uptime / 86400) && `${Math.floor(uptime / 86400)}d`,
        Math.floor((uptime % 86400) / 3600) && `${Math.floor((uptime % 86400) / 3600)}h`,
        Math.floor((uptime % 3600) / 60) && `${Math.floor((uptime % 3600) / 60)}m`,
        `${Math.floor(uptime % 60)}s`
    ].filter(Boolean).join(' ')

    const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)

    const sessionPath = path.join('./session/Sub-bots', userId)
    let sessionSize = '?'
    try {
        let total = 0
        for (const f of fs.readdirSync(sessionPath)) {
            try { total += fs.statSync(path.join(sessionPath, f)).size } catch { }
        }
        sessionSize = total < 1024 * 1024
            ? `${(total / 1024).toFixed(1)} KB`
            : `${(total / 1024 / 1024).toFixed(2)} MB`
    } catch { }

    const rcanal = await getRcanal()

    const text =
        `╭━━━━━━━━━━━━━━━━━━━━━╮
│  🤖 *MI SUB-BOT*
╰━━━━━━━━━━━━━━━━━━━━━╯

👤 *Identidad*
 📛 Nombre · *${botName}*
 📱 Número · *${botNum}*
 👑 Owner · *${ownerDisp}*
 📅 Creado · *${createdAt}*

⚙️ *Configuración*
 🌐 Modo · *${modo}*
 🚫 Anti-Privado · *${antiPriv}*
 🛡️ Anti-Spam · *${antiSpam}*
 ⏱️ Cooldown · *${cooldown}ms*
 🖼️ Logo · *${logo}*

📡 *Estado*
 ${wsEmoji} Conexión · *${wsLabel}*
 🕐 Conectado · *${connDate}*
 ⏱️ Uptime · *${uptimeStr}*
 💾 RAM · *${ram} MB*
 📦 Sesión · *${sessionSize}*

> ✦ ${global.dev || 'Powered by Fernando'}`

    await conn.sendMessage(from, {
        text,
        contextInfo: rcanal
    }, { quoted: m })
}

handler.help = ['mibot', 'mybotinfo', 'mybot']
handler.tags = ['serbot']
handler.command = ['mibot', 'mybotinfo', 'mybot', 'subbotinfo']

export default handler