import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), 'data')
const ECONOMY_FILE = join(DATA_DIR, 'economy.json')
const PROFILES_FILE = join(DATA_DIR, 'profiles.json')

function getEconomy() {
    try {
        if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
        if (!existsSync(ECONOMY_FILE)) writeFileSync(ECONOMY_FILE, '[]')
        return JSON.parse(readFileSync(ECONOMY_FILE, 'utf-8'))
    } catch { return [] }
}

function getProfiles() {
    try {
        if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
        if (!existsSync(PROFILES_FILE)) writeFileSync(PROFILES_FILE, '[]')
        return JSON.parse(readFileSync(PROFILES_FILE, 'utf-8'))
    } catch { return [] }
}

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')

    const ecoData = getEconomy()
    const profilesData = getProfiles()

    let eco = ecoData.find(u => u.username === userId)
    if (!eco) eco = { username: userId, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }

    let profile = profilesData.find(p => p.username === userId)
    if (!profile) profile = { username: userId, displayName: '', bio: 'Sin biografía', avatar: '', phone: userId }

    const totalMoney = (eco.money || 0) + (eco.bank || 0)
    const expNeeded = (eco.level || 1) * 100

    let txt = `👤 *PERFIL DE @${userId}*\n\n`
    if (profile.displayName) txt += `📝 *Nombre:* ${profile.displayName}\n`
    txt += `📱 *Número:* +${userId}\n`
    if (profile.bio && profile.bio !== 'Sin biografía') txt += `💬 *Bio:* ${profile.bio}\n`
    txt += `\n💰 *Economía*\n`
    txt += `💵 Efectivo: $${(eco.money || 0).toLocaleString()}\n`
    txt += `🏦 Banco: $${(eco.bank || 0).toLocaleString()}\n`
    txt += `💎 Total: $${totalMoney.toLocaleString()}\n`
    txt += `\n⭐ *Nivel:* ${eco.level || 1}\n`
    txt += `✨ *Exp:* ${eco.exp || 0}/${expNeeded}\n`
    txt += `\n📝 Usa *${usedPrefix}balance* para ver tu dinero\n`
    txt += `📝 Edita tu perfil en: /dashboard`

    let profilePicUrl = profile.avatar || ''

    try {
        if (profilePicUrl && profilePicUrl.startsWith('http')) {
            await conn.sendMessage(m.chat, {
                image: { url: profilePicUrl },
                caption: txt,
                mentions: [userJid]
            }, { quoted: m })
        } else {
            try {
                const pp = await conn.profilePictureUrl(userJid, 'image').catch(() => null)
                if (pp) {
                    await conn.sendMessage(m.chat, {
                        image: { url: pp },
                        caption: txt,
                        mentions: [userJid]
                    }, { quoted: m })
                } else {
                    await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
                }
            } catch {
                await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
            }
        }
    } catch {
        await conn.sendMessage(m.chat, { text: txt, mentions: [userJid] }, { quoted: m })
    }
}

handler.help = ['perfil', 'profile', 'miperfil']
handler.tags = ['economy', 'info']
handler.command = ['perfil', 'profile', 'miperfil', 'myprofile']

export default handler
