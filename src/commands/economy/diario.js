import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const ECONOMY_FILE = join(DATA_DIR, 'economy.json')

function getEconomy() {
    try {
        if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
        if (!existsSync(ECONOMY_FILE)) writeFileSync(ECONOMY_FILE, '[]')
        return JSON.parse(readFileSync(ECONOMY_FILE, 'utf-8'))
    } catch { return [] }
}

function saveEconomy(data) {
    try {
        if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
        writeFileSync(ECONOMY_FILE, JSON.stringify(data, null, 2))
    } catch (e) { console.error('Error guardando economía:', e.message) }
}

let handler = async (m, { conn, usedPrefix }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    const data = getEconomy()
    let user = data.find(u => u.username === userId)

    if (!user) {
        user = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, inventory: [] }
        data.push(user)
        saveEconomy(data)
    }

    const now = Date.now()
    const cooldown = 24 * 60 * 60 * 1000

    if (user.lastClaim && (now - user.lastClaim) < cooldown) {
        const remaining = cooldown - (now - user.lastClaim)
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        return conn.sendMessage(m.chat, { text: `⏳ Ya reclamaste tu recompensa diaria.\nVuelve en *${hours}h ${minutes}m*` }, { quoted: m })
    }

    const baseReward = Math.floor(Math.random() * 500) + 200
    const bonus = user.level * 50
    const total = baseReward + bonus

    user.money += total
    user.exp += 20
    user.lastClaim = now

    if (user.exp >= user.level * 100) {
        user.exp -= user.level * 100
        user.level += 1
    }

    saveEconomy(data)

    await conn.sendMessage(m.chat, {
        text: `🎁 *RECOMPENSA DIARIA*\n\n💰 Dinero: +$${total.toLocaleString()}\n✨ Exp: +20\n⭐ Nivel: ${user.level}\n\n${bonus > 0 ? `🎉 Bonus por nivel: +$${bonus.toLocaleString()}\n` : ''}Vuelve mañana por más!`,
        mentions: [userJid]
    }, { quoted: m })
}

handler.help = ['diario', 'daily', 'claim']
handler.tags = ['economy']
handler.command = ['diario', 'daily', 'claim', 'reclamar']

export default handler