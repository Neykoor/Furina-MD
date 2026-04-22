// menu-subbot.js - Menú completo estilo Asta con Sub-Bot
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

async function getRcanal() {
    try {
        const thumb = await (await fetch(global.icono)).buffer()
        return {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.channelRD?.id || "120363399175402285@newsletter",
                serverMessageId: '',
                newsletterName: global.channelRD?.name || "『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』"
            },
            externalAdReply: {
                title: global.botname || 'ᴀsᴛᴀ-ʙᴏᴛ',
                body: global.dev || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ ғᴇʀɴᴀɴᴅᴏ',
                mediaType: 1,
                mediaUrl: global.redes,
                sourceUrl: global.redes,
                thumbnail: thumb,
                showAdAttribution: false,
                containsAutoReply: true,
                renderLargerThumbnail: false
            }
        }
    } catch {
        return {}
    }
}

function cleanNum(jid) {
    if (!jid) return ''
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

function getSubConfig(userId) {
    const SUBBOT_FOLDER = path.join(process.cwd(), 'session', 'Sub-bots')
    const uid = cleanNum(userId) || userId
    const configPath = path.join(SUBBOT_FOLDER, uid, 'config.json')

    try {
        if (fs.existsSync(configPath)) {
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            return {
                name: global.botname || saved.name || 'Asta Bot',
                mode: saved.mode || 'public',
                antiPrivate: saved.antiPrivate || false,
                antiSpam: saved.antiSpam !== false,
                cooldown: saved.cooldown || 3000,
                logoUrl: saved.logoUrl || null,
                owner: saved.owner || null,
                ...saved
            }
        }
    } catch { }

    return {
        name: global.botname || 'Asta Bot',
        mode: 'public',
        antiPrivate: false,
        antiSpam: true,
        cooldown: 3000,
        logoUrl: null,
        owner: null
    }
}

let handler = async (m, { conn }) => {
    const rcanal = await getRcanal()

    const totalUsers = Object.keys(global.db?.data?.users || {}).length || 0
    const totalCommands = Object.values(global.plugins || {}).filter(v => v.help && v.tags).length || 0

    const botId = conn.user?.jid || ''
    const userId_clean = cleanNum(botId)

    let botConfig = {}
    let isSubBot = false

    if (conn.isSubBot) {
        isSubBot = true
        botConfig = conn.subConfig || getSubConfig(userId_clean)
    } else {
        for (const [id, sock] of global.subBots || []) {
            if (sock?.user?.jid === botId) {
                isSubBot = true
                botConfig = sock.subConfig || getSubConfig(cleanNum(botId))
                break
            }
        }
    }

    const botName = botConfig.name || global.botname || 'ᴀsᴛᴀ-ʙᴏᴛ'
    const botMode = isSubBot ? (botConfig.mode || 'public') : 'private'
    const version = global.vs || '1.5'

    let _uptime = process.uptime() * 1000
    let uptime = clockString(_uptime)

    let mentionedJid = m.mentionedJid?.length ? m.mentionedJid[0] : m.sender

    let txt = `> . ﹡ ﹟ 🎭 ׄ ⬭ *¡ʜᴏʟᴀ!* @${mentionedJid.split('@')[0]}

*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜⚡* ㅤ֢ㅤ⸱ㅤᯭִ*
ㅤ𓏸𓈒ㅤׄ *sᴏʏ* :: *${botName.toUpperCase()}*
ׅㅤ𓏸𓈒ㅤׄ *ᴛʏᴘᴇ* :: ${isSubBot ? '𝗦𝘂𝗯-𝗕𝗼𝘁 🅑' : '𝗣𝗿𝗶𝗻𝗰𝗶𝗽𝗮𝗹 🅥'}
ׅㅤ𓏸𓈒ㅤׄ *ᴅᴇᴠᴇʟᴏᴘᴇʀ* :: ${global.etiqueta || '𝕱𝖊𝖗𝖓𝖆𝖓𝖉𝖔 👑'}
ׅㅤ𓏸𓈒ㅤׄ *ᴠᴇʀsɪᴏ́ɴ* :: ${version}
ׅㅤ𓏸𓈒ㅤׄ *sᴇʀᴠɪᴅᴏʀ* :: México 🇲🇽 
ׅㅤ𓏸𓈒ㅤׄ *ᴜᴘᴛɪᴍᴇ* :: ${uptime}

> ## \`𝖨𝖭𝖥𝖮𝖱𝖬𝖠𝖢𝖨𝖮́𝖭 ⚔️\`

ׅㅤ𓏸𓈒ㅤׄ *ᴄᴏᴍᴀɴᴅᴏs* :: ${totalCommands}   
ׅㅤ𓏸𓈒ㅤׄ *ᴍᴏᴅᴏ* :: ${botMode === 'private' ? '𝗣𝗿𝗶𝘃𝗮𝗱ᴏ 🔐' : '𝗣𝘂́𝗯𝗹𝗶ᴄᴏ 🔓'}
ׅㅤ𓏸𓈒ㅤׄ *ᴜsᴜᴀʀɪᴏs* :: ${totalUsers.toLocaleString()}
ㅤ𓏸𓈒ㅤׄ *ᴘɪɴɢ* :: ${Date.now() - m.timestamp}ms
ׅㅤ𓏸𓈒ㅤׄ *ʟɪʙʀᴇʀɪᴀ* :: ${global.libreria || 'Baileys Multi Device'} 

> ## \`𝖲𝖴𝖡-𝖡𝖮𝖳 🔌\`

*ㅤꨶ〆⁾ ㅤׄㅤ⸼ㅤׄ *͜🤖* ㅤ֢ㅤ⸱ㅤᯭִ* — *ᴄʀᴇᴀʀ ʏ ᴄᴏɴғɪɢᴜʀᴀʀ*
ׅㅤ𓏸𓈒ㅤׄ *.qr* :: ᴄʀᴇᴀʀ sᴜʙ-ʙᴏᴛ (ǫʀ)
ׅㅤ𓏸𓈒ㅤׄ *.code* :: ᴄʀᴇᴀʀ sᴜʙ-ʙᴏᴛ (ᴄᴏᴅɪɢᴏ)
ׅㅤ𓏸𓈒ㅤׄ *.config* :: ᴄᴏɴғɪɢᴜʀᴀʀ sᴜʙ-ʙᴏᴛ
ׅㅤ𓏸𓈒ㅤׄ *.delsub* :: ᴇʟɪᴍɪɴᴀʀ sᴜʙ-ʙᴏᴛ
ׅㅤ𓏸𓈒ㅤׄ *.bots* :: ʟɪsᴛᴀ ᴅᴇ sᴜʙ-ʙᴏᴛs`.trim()

    let logoBuffer = null
    let logoUrl = (isSubBot && botConfig.logoUrl) ? botConfig.logoUrl :
        (global.logo || global.icono || 'https://raw.githubusercontent.com/Fer2809fl/Asta_bot/refs/heads/main/lib/astavs.jpg')

    try {
        const response = await fetch(logoUrl)
        if (response.ok) logoBuffer = await response.buffer()
    } catch (e) { }

    try {
        if (logoBuffer) {
            await conn.sendMessage(m.chat, {
                image: logoBuffer,
                caption: txt,
                contextInfo: {
                    mentionedJid: [mentionedJid],
                    ...rcanal
                }
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                text: txt,
                contextInfo: {
                    mentionedJid: [mentionedJid],
                    ...rcanal
                }
            }, { quoted: m })
        }
    } catch (e) {
        await conn.reply(m.chat, txt, m)
    }
}

handler.help = ['menu', 'menuall', 'menú', 'allmenu', 'comandos', 'menucompleto']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'allmenu', 'comandos', 'menucompleto', 'menuall']

function clockString(ms) {
    let seconds = Math.floor((ms / 1000) % 60)
    let minutes = Math.floor((ms / (1000 * 60)) % 60)
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${hours}h ${minutes}m ${seconds}s`
}

export default handler;