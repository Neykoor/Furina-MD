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

function getUserEconomy(userId) {
    const data = getEconomy()
    let user = data.find(u => u.username === userId)
    if (!user) {
        user = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, inventory: [] }
        data.push(user)
        saveEconomy(data)
    }
    return user
}

function updateUserEconomy(userId, updates) {
    const data = getEconomy()
    const index = data.findIndex(u => u.username === userId)
    if (index === -1) {
        const user = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, inventory: [], ...updates }
        data.push(user)
        saveEconomy(data)
        return user
    }
    data[index] = { ...data[index], ...updates }
    saveEconomy(data)
    return data[index]
}

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    const eco = getUserEconomy(userId)

    let txt = `💰 *BALANCE DE @${userId}*\n\n`
    txt += `💵 *Efectivo:* $${eco.money.toLocaleString()}\n`
    txt += `🏦 *Banco:* $${eco.bank.toLocaleString()}\n`
    txt += `💰 *Total:* $${(eco.money + eco.bank).toLocaleString()}\n`
    txt += `⭐ *Nivel:* ${eco.level}\n`
    txt += `✨ *Exp:* ${eco.exp}\n\n`
    txt += `📝 Usa *${usedPrefix}depositar <cantidad>* para guardar dinero en el banco\n`
    txt += `📝 Usa *${usedPrefix}retirar <cantidad>* para sacar dinero del banco`

    await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
}

handler.help = ['balance', 'bal', 'dinero', 'wallet']
handler.tags = ['economy']
handler.command = ['balance', 'bal', 'dinero', 'wallet', 'money']

export default handler