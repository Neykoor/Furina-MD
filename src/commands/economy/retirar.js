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

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    const data = getEconomy()
    let user = data.find(u => u.username === userId)

    if (!user) {
        user = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, inventory: [] }
        data.push(user)
        saveEconomy(data)
    }

    const amount = parseInt(args[0])
    if (!amount || isNaN(amount) || amount <= 0) {
        return conn.sendMessage(m.chat, { text: `❌ Ingresa una cantidad válida.\nEjemplo: *${usedPrefix}retirar 1000*` }, { quoted: m })
    }

    if (user.bank < amount) {
        return conn.sendMessage(m.chat, { text: `❌ No tienes suficiente dinero en el banco.\nBanco: $${user.bank.toLocaleString()}` }, { quoted: m })
    }

    user.bank -= amount
    user.money += amount
    saveEconomy(data)

    await conn.sendMessage(m.chat, {
        text: `🏦 *RETIRO EXITOSO*\n\n💵 Retirado: $${amount.toLocaleString()}\n💰 Efectivo: $${user.money.toLocaleString()}\n🏦 Banco restante: $${user.bank.toLocaleString()}`,
        mentions: [userJid]
    }, { quoted: m })
}

handler.help = ['retirar <cantidad>', 'ret <cantidad>']
handler.tags = ['economy']
handler.command = ['retirar', 'ret', 'withdraw']

export default handler