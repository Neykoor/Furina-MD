// menu-subbot.js - Menú principal (estructura compatible como subbot.js)
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import pkg from '@whiskeysockets/baileys'

const { generateWAMessageFromContent, proto, WA_DEFAULT_EPHEMERAL } = pkg

function cleanNum(jid) {
    if (!jid) return ''
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

function readSubConfigFromFile(userId) {
    const SUBBOT_FOLDER = path.join(process.cwd(), 'session', 'Sub-bots')
    const uid = cleanNum(userId) || userId
    const configPath = path.join(SUBBOT_FOLDER, uid, 'config.json')

    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf-8')
            const saved = JSON.parse(raw)
            return {
                name: saved.name || global.botname || 'Asta Bot',
                mode: saved.mode || 'public',
                logoUrl: saved.logoUrl || null,
                logos: saved.logos || {},
                owner: saved.owner || null,
                ...saved
            }
        }
    } catch (e) {
        console.log(`[menu-subbot] Error leyendo config: ${e.message}`)
    }

    return {
        name: global.botname || 'Asta Bot',
        mode: 'public',
        logoUrl: null,
        logos: {},
        owner: null
    }
}

async function getLogoForZone(conn, zone, botConfig, isSubBot) {
    if (isSubBot && botConfig.logos && botConfig.logos[zone]) return botConfig.logos[zone]
    if (isSubBot && botConfig.logoUrl) return botConfig.logoUrl
    if (global.logo) return global.logo
    if (global.icono) return global.icono
    return 'https://raw.githubusercontent.com/Fer2809fl/Asta_bot/refs/heads/main/lib/astavs.jpg'
}

async function downloadLogo(logoUrl) {
    if (!logoUrl) return null
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const response = await fetch(logoUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            }
        })
        clearTimeout(timeout)
        if (response.ok) {
            const contentType = response.headers.get('content-type') || ''
            if (contentType.startsWith('image/')) {
                const buffer = await response.buffer()
                return buffer
            }
        }
        return null
    } catch (e) {
        return null
    }
}

async function getRcanal() {
    try {
        const thumb = await (await fetch(global.icono)).buffer()
        return {
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
    } catch { return {} }
}

let handler = async (m, { conn }) => {
    const botId = conn.user?.jid || ''
    const userId_clean = cleanNum(botId)

    let isSubBot = false
    let botConfig = {}

    if (conn.isSubBot) {
        isSubBot = true
        botConfig = readSubConfigFromFile(userId_clean)
        conn.subConfig = botConfig
    } else {
        for (const [id, sock] of global.subBots || []) {
            const sockJid = sock?.user?.jid || ''
            if (sockJid === botId || cleanNum(sockJid) === userId_clean) {
                isSubBot = true
                botConfig = readSubConfigFromFile(cleanNum(sockJid))
                sock.subConfig = botConfig
                break
            }
        }
    }

    const botName = botConfig.name || global.botname || 'ᴀsᴛᴀ-ʙᴏᴛ'
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

> ## \`𝖲𝖤𝖫𝖤𝖢𝖢𝖨𝖮́𝖭 ⚔️\`

📋 *Selecciona una opción del menú:*`.trim()

    const logoUrl = await getLogoForZone(conn, 'menu', botConfig, isSubBot)
    const logoBuffer = await downloadLogo(logoUrl)

    try {
        // ===== TODO EN UN SOLO MENSAJE: Imagen + Texto + Botones =====
        const interactiveMessage = {
            body: {
                text: txt
            },
            footer: {
                text: `✨ ${botName} • Powered by Asta`
            },
            header: logoBuffer ? {
                hasMediaAttachment: true,
                imageMessage: {
                    url: '',
                    mimetype: 'image/jpeg',
                    caption: '',
                    fileLength: logoBuffer.length,
                    height: 500,
                    width: 500,
                    mediaKey: '',
                    fileEncSha256: '',
                    directPath: '',
                    mediaKeyTimestamp: Math.floor(Date.now() / 1000)
                }
            } : {
                hasMediaAttachment: false
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📂 Abrir Menús',
                            sections: [
                                {
                                    title: '🎮 MENÚS DISPONIBLES',
                                    rows: [
                                        { id: '.gacha', title: '🎰 Menú Gacha', description: 'Sistema de gacha y personajes' },
                                        { id: '.grupo', title: '👥 Menú Grupo', description: 'Comandos de administración de grupos' },
                                        { id: '.antilinks', title: '🛡️ Menú Antilinks', description: 'Protección contra enlaces' },
                                        { id: '.rpg', title: '⚔️ Menú RPG', description: 'Sistema de rol y aventuras' },
                                        { id: '.games', title: '🎮 Menú Games', description: 'Juegos y diversión' }
                                    ]
                                },
                                {
                                    title: '🔧 CONFIGURACIÓN',
                                    rows: [
                                        { id: '.config', title: '⚙️ Configurar Sub-Bot', description: 'Personalizar tu sub-bot' },
                                        { id: '.restartbot', title: '🔄 Reiniciar Bot', description: 'Reiniciar el sub-bot' }
                                    ]
                                }
                            ]
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📢 Canal',
                            url: global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21',
                            merchant_url: global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🌐 Web',
                            url: global.redes || 'https://study-bots.xo.je',
                            merchant_url: global.redes || 'https://study-bots.xo.je'
                        })
                    },
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '👥 Comunidad',
                            url: global.comunidad || 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO',
                            merchant_url: global.comunidad || 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO'
                        })
                    }
                ],
                messageParamsJson: ''
            }
        }

        const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage
                }
            }
        })

        const msg = await generateWAMessageFromContent(m.chat, messageContent, {
            userJid: conn.user?.jid,
            quoted: m,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        })

        // Si hay logo, lo adjuntamos al mensaje
        if (logoBuffer) {
            msg.message.viewOnceMessage.message.interactiveMessage.header.imageMessage.jpegThumbnail = logoBuffer
        }

        await conn.relayMessage(m.chat, msg.message, {
            messageId: msg.key.id,
            mentionedJid: [mentionedJid]
        })

    } catch (e) {
        console.log(`[menu-subbot] Error: ${e.message}`)
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

export default handler
