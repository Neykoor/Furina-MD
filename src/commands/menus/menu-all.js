// menu.js - Menú principal Asta Bot (optimizado para Baileys-Fer)
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import {
    menuLista,
    botonesRapidos,
    botonUrl,
    mensajeInteractivo
} from '../funciones/botones.js'

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
        console.log(`[menu] Error leyendo config: ${e.message}`)
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
                return await response.buffer()
            }
        }
        return null
    } catch (e) {
        return null
    }
}

function clockString(ms) {
    let seconds = Math.floor((ms / 1000) % 60)
    let minutes = Math.floor((ms / (1000 * 60)) % 60)
    let hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${hours}h ${minutes}m ${seconds}s`
}

let handler = async (m, { conn }) => {
    const botId = conn.user?.jid || ''
    const userId_clean = cleanNum(botId)

    let isSubBot = false
    let botConfig = {}

    // Detectar si es sub-bot
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
    const version = global.vs || '2.0'
    let uptime = clockString(process.uptime() * 1000)
    let mentionedJid = m.mentionedJid?.length ? m.mentionedJid[0] : m.sender

    // Texto principal del menú
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

    // Secciones para el menú de lista
    const sections = [
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

    // Botones rápidos para enlaces externos
    const channelUrl = global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
    const webUrl = global.redes || 'https://study-bots.xo.je'
    const communityUrl = global.comunidad || 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO'

    try {
        // PASO 1: Enviar imagen con caption (si hay logo)
        if (logoBuffer) {
            await conn.sendMessage(m.chat, {
                image: logoBuffer,
                caption: txt,
                mentions: [mentionedJid]
            }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, {
                text: txt,
                mentions: [mentionedJid]
            }, { quoted: m })
        }

        // PASO 2: Menú de lista desplegable
        const listResult = await menuLista(
            conn,
            m.chat,
            '📂 Abrir Menús',
            'Toca para ver las categorías disponibles:',
            sections,
            { quoted: m }
        )

        if (!listResult.success) {
            console.log(`[menu] menuLista fallback: ${listResult.error || 'unknown'}`)
            // Fallback manual a texto
            let fallbackText = `*📂 MENÚ PRINCIPAL*\n\n`
            sections.forEach(sec => {
                fallbackText += `\n*${sec.title}*\n`
                sec.rows.forEach(row => {
                    fallbackText += `  ├ *${row.id}* — ${row.title}\n`
                    if (row.description) fallbackText += `  │  _${row.description}_\n`
                })
            })
            await conn.sendMessage(m.chat, { text: fallbackText }, { quoted: m })
        }

        // PASO 3: Botones rápidos de enlaces
        const quickResult = await botonesRapidos(
            conn,
            m.chat,
            '🔗 *Enlaces Oficiales*',
            [
                { id: 'open_channel', text: '📢 Canal' },
                { id: 'open_web', text: '🌐 Web' },
                { id: 'open_community', text: '👥 Comunidad' }
            ],
            { quoted: m }
        )

        if (!quickResult.success) {
            console.log(`[menu] botonesRapidos fallback: ${quickResult.error || 'unknown'}`)
            // Fallback a botones URL directos
            await mensajeInteractivo(
                conn,
                m.chat,
                '🔗 *Enlaces Oficiales*',
                [
                    { type: 'url', text: '📢 Canal', value: channelUrl },
                    { type: 'url', text: '🌐 Web', value: webUrl },
                    { type: 'url', text: '👥 Comunidad', value: communityUrl }
                ],
                { quoted: m }
            )
        }

    } catch (e) {
        console.log(`[menu] Error crítico: ${e.message}`)
        // Último recurso: texto plano completo
        let emergencyText = `${txt}\n\n`
        sections.forEach(sec => {
            emergencyText += `\n*${sec.title}*\n`
            sec.rows.forEach(row => {
                emergencyText += `  └ ${row.id} — ${row.title}\n`
            })
        })
        emergencyText += `\n🔗 *Enlaces:*\n📢 ${channelUrl}\n🌐 ${webUrl}\n👥 ${communityUrl}`
        
        await conn.reply(m.chat, emergencyText, m)
    }
}

handler.help = ['menu', 'menuall', 'allmenu']
handler.tags = ['main']
handler.command = ['menu', 'allmenu', 'menuall']

export default handler