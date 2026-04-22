// menu-rpg.js - Menú RPG
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

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
            const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
            return { name: saved.name || global.botname || 'Asta Bot', logos: saved.logos || {}, logoUrl: saved.logoUrl || null, ...saved }
        }
    } catch (e) { }
    return { name: global.botname || 'Asta Bot', logos: {}, logoUrl: null }
}

async function getLogoForZone(conn, zone, botConfig, isSubBot) {
    if (isSubBot && botConfig.logos && botConfig.logos[zone]) return botConfig.logos[zone]
    if (isSubBot && botConfig.logoUrl) return botConfig.logoUrl
    if (global.rpg) return global.rpg
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
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }
        })
        clearTimeout(timeout)
        if (response.ok) {
            const ct = response.headers.get('content-type') || ''
            if (ct.startsWith('image/')) return await response.buffer()
        }
        return null
    } catch (e) { return null }
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
            if ((sock?.user?.jid || '') === botId) {
                isSubBot = true
                botConfig = readSubConfigFromFile(cleanNum(sock.user.jid))
                break
            }
        }
    }

    let txt = `
╭━━━〔 ⚔️ *MENÚ RPG* 〕━━━╮
┃
┃ ⏳ *Próximamente...*
┃
┃ ⚔️ Los comandos RPG estarán 
┃    disponibles muy pronto.
┃
╰━━━━━━━━━━━━━━━━━━╯`.trim()

    const logoUrl = await getLogoForZone(conn, 'rpg', botConfig, isSubBot)
    const logoBuffer = await downloadLogo(logoUrl)

    try {
        if (logoBuffer) {
            await conn.sendMessage(m.chat, { image: logoBuffer, caption: txt }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }
    } catch (e) {
        await conn.reply(m.chat, txt, m)
    }
}

handler.help = ['rpg']
handler.tags = ['rpg']
handler.command = ['rpg', 'menurpg']

export default handler