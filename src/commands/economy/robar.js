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

const crimenes = [
    { nombre: 'Robar una tienda', ganancia: [100, 800], riesgo: 0.3, exp: 15 },
    { nombre: 'Asaltar un banco', ganancia: [500, 3000], riesgo: 0.5, exp: 35 },
    { nombre: 'Hackear un cajero', ganancia: [200, 1500], riesgo: 0.25, exp: 25 },
    { nombre: 'Vender artículos robados', ganancia: [300, 1200], riesgo: 0.2, exp: 20 },
    { nombre: 'Secuestrar y pedir rescate', ganancia: [1000, 5000], riesgo: 0.6, exp: 50 },
    { nombre: 'Estafar por WhatsApp', ganancia: [50, 400], riesgo: 0.15, exp: 10 },
    { nombre: 'Robar un auto de lujo', ganancia: [800, 4000], riesgo: 0.45, exp: 40 },
    { nombre: 'Carterista en el metro', ganancia: [20, 200], riesgo: 0.1, exp: 8 },
    { nombre: 'Robar una casa', ganancia: [400, 2500], riesgo: 0.35, exp: 30 },
    { nombre: 'Fraude con tarjetas', ganancia: [600, 3500], riesgo: 0.4, exp: 35 }
]

const castigos = [
    'La policía te atrapó y te quitaron todo lo robado.',
    'Fuiste a la cárcel, perdiste dinero en la fianza.',
    'Un testigo te delató, tuviste que sobornar al juez.',
    'El dueño te descubrió y llamó a la policía.',
    'Tu cómplice te traicionó y se quedó con todo.',
    'Las cámaras de seguridad te grabaron, tuviste que pagar multa.'
]

let handler = async (m, { conn, usedPrefix }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')
    const data = getEconomy()
    let user = data.find(u => u.username === userId)

    if (!user) {
        user = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }
        data.push(user)
        saveEconomy(data)
    }

    const now = Date.now()
    const cooldown = 5 * 60 * 1000

    if (user.lastCrime && (now - user.lastCrime) < cooldown) {
        const remaining = cooldown - (now - user.lastCrime)
        const minutes = Math.floor(remaining / (60 * 1000))
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000)
        return conn.sendMessage(m.chat, { text: `🚔 Debes esperar *${minutes}m ${seconds}s* antes de cometer otro crimen.\nLa policía está patrullando...` }, { quoted: m })
    }

    const crimen = crimenes[Math.floor(Math.random() * crimenes.length)]
    const exito = Math.random() > crimen.riesgo

    user.lastCrime = now

    if (exito) {
        const ganancia = Math.floor(Math.random() * (crimen.ganancia[1] - crimen.ganancia[0])) + crimen.ganancia[0]
        user.money += ganancia
        user.exp += crimen.exp

        if (user.exp >= user.level * 100) {
            user.exp -= user.level * 100
            user.level += 1
        }

        saveEconomy(data)

        const mensajesExito = [
            `¡Todo salió perfecto! Nadie te vio.`,
            `Limpiaste tus huellas, trabajo limpio.`,
            `El golpe fue un éxito, el dinero es tuyo.`,
            `Escapaste justo a tiempo con el botín.`,
            `Nadie sospecha de ti... por ahora.`
        ]

        await conn.sendMessage(m.chat, {
            text: `🦹 *${crimen.nombre.toUpperCase()}*\n\n✅ *¡ÉXITO!*\n${mensajesExito[Math.floor(Math.random() * mensajesExito.length)]}\n\n💰 Ganancia: +$${ganancia.toLocaleString()}\n✨ Exp: +${crimen.exp}\n⭐ Nivel: ${user.level}\n💵 Efectivo actual: $${user.money.toLocaleString()}`,
            mentions: [userJid]
        }, { quoted: m })
    } else {
        const multa = Math.floor(Math.random() * 300) + 50
        user.money = Math.max(0, user.money - multa)
        const castigo = castigos[Math.floor(Math.random() * castigos.length)]

        saveEconomy(data)

        await conn.sendMessage(m.chat, {
            text: `🦹 *${crimen.nombre.toUpperCase()}*\n\n❌ *¡FRACASO!*\n${castigo}\n\n💸 Multa: -$${multa.toLocaleString()}\n💵 Efectivo actual: $${user.money.toLocaleString()}\n\n⏳ Espera 5 minutos para intentar otro crimen.`,
            mentions: [userJid]
        }, { quoted: m })
    }
}

handler.help = ['crimen', 'crime', 'robar']
handler.tags = ['economy', 'rpg']
handler.command = ['crimen', 'crime', 'robar']

export default handler