import fs from 'fs'
import path from 'path'

const premiumDir = path.join(process.cwd(), 'lib', 'premium')
const premiumFile = path.join(premiumDir, 'premium.json')
const subpremFile = path.join(premiumDir, 'subprem.json')
const botsFile = path.join(premiumDir, 'bots.json')
const allowedSubbotsFile = path.join(premiumDir, 'allowed_subbots.json')

function loadPremium() {
    try {
        if (!fs.existsSync(premiumFile)) {
            fs.mkdirSync(path.dirname(premiumFile), { recursive: true })
            fs.writeFileSync(premiumFile, JSON.stringify({ users: {}, tokens: {} }, null, 2))
        }
        return JSON.parse(fs.readFileSync(premiumFile, 'utf-8'))
    } catch {
        return { users: {}, tokens: {} }
    }
}

function loadSubprem() {
    try {
        if (!fs.existsSync(subpremFile)) {
            fs.mkdirSync(path.dirname(subpremFile), { recursive: true })
            fs.writeFileSync(subpremFile, JSON.stringify({ subbots: {} }, null, 2))
        }
        return JSON.parse(fs.readFileSync(subpremFile, 'utf-8'))
    } catch {
        return { subbots: {} }
    }
}

function loadBots() {
    try {
        if (!fs.existsSync(botsFile)) {
            fs.mkdirSync(path.dirname(botsFile), { recursive: true })
            fs.writeFileSync(botsFile, JSON.stringify({ bots: {} }, null, 2))
        }
        return JSON.parse(fs.readFileSync(botsFile, 'utf-8'))
    } catch {
        return { bots: {} }
    }
}

function loadAllowedSubbots() {
    try {
        if (!fs.existsSync(allowedSubbotsFile)) {
            fs.mkdirSync(path.dirname(allowedSubbotsFile), { recursive: true })
            fs.writeFileSync(allowedSubbotsFile, JSON.stringify({ allowed: {} }, null, 2))
        }
        return JSON.parse(fs.readFileSync(allowedSubbotsFile, 'utf-8'))
    } catch {
        return { allowed: {} }
    }
}

function savePremium(data) {
    fs.mkdirSync(path.dirname(premiumFile), { recursive: true })
    fs.writeFileSync(premiumFile, JSON.stringify(data, null, 2))
}

function saveSubprem(data) {
    fs.mkdirSync(path.dirname(subpremFile), { recursive: true })
    fs.writeFileSync(subpremFile, JSON.stringify(data, null, 2))
}

function saveBots(data) {
    fs.mkdirSync(path.dirname(botsFile), { recursive: true })
    fs.writeFileSync(botsFile, JSON.stringify(data, null, 2))
}

function saveAllowedSubbots(data) {
    fs.mkdirSync(path.dirname(allowedSubbotsFile), { recursive: true })
    fs.writeFileSync(allowedSubbotsFile, JSON.stringify(data, null, 2))
}

export function normalize(num) {
    return String(num).replace(/[^0-9]/g, '')
}

export function isGlobalOwner(sender) {
    const num = normalize(sender)
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => normalize(Array.isArray(o) ? o[0] : o) === num)
}

export function isPremium(sender) {
    const data = loadPremium()
    return !!data.users[normalize(sender)]
}

export function isSubbotPremium(botNumber) {
    const data = loadSubprem()
    return !!data.subbots[normalize(botNumber)]
}

export function getPremiumInfo(sender) {
    const data = loadPremium()
    return data.users[normalize(sender)] || null
}

export function getPremiumOwnerOfSubbot(botNumber) {
    const data = loadSubprem()
    const info = data.subbots[normalize(botNumber)]
    return info?.registeredBy || null
}

export function getUserType(sender) {
    const num = normalize(sender)
    if (isGlobalOwner(num)) return 'global_owner'
    if (isPremium(num)) return 'premium'
    if (isSubbotPremium(num)) return 'subprem'
    return 'free'
}

export function isAllowedSubbot(botNumber, ownerNumber) {
    const data = loadAllowedSubbots()
    const botNum = normalize(botNumber)
    const ownerNum = normalize(ownerNumber)
    if (!data.allowed[ownerNum]) return true
    return data.allowed[ownerNum].includes(botNum)
}

export function allowSubbot(ownerNumber, targetNumber) {
    const data = loadAllowedSubbots()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    
    if (!data.allowed[ownerNum]) data.allowed[ownerNum] = []
    if (data.allowed[ownerNum].includes(targetNum)) {
        return { success: false, message: '❌ Este sub-bot ya está permitido' }
    }
    
    data.allowed[ownerNum].push(targetNum)
    saveAllowedSubbots(data)
    return { success: true, message: `✅ Sub-bot @${targetNum} permitido`, mentions: [targetNumber] }
}

export function disallowSubbot(ownerNumber, targetNumber) {
    const data = loadAllowedSubbots()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    
    if (!data.allowed[ownerNum]?.includes(targetNum)) {
        return { success: false, message: '❌ Este sub-bot no está en tu lista' }
    }
    
    data.allowed[ownerNum] = data.allowed[ownerNum].filter(num => num !== targetNum)
    saveAllowedSubbots(data)
    return { success: true, message: `✅ Sub-bot @${targetNum} removido`, mentions: [targetNumber] }
}

export function getAllowedSubbots(ownerNumber) {
    return loadAllowedSubbots().allowed[normalize(ownerNumber)] || []
}

export function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = 'ASTA-'
    for (let i = 0; i < 5; i++) token += chars[Math.floor(Math.random() * chars.length)]
    return token
}

export function createPremiumToken(creator) {
    if (!isGlobalOwner(creator)) {
        return { success: false, message: '❌ Solo owners globales pueden crear tokens' }
    }
    const data = loadPremium()
    const token = generateToken()
    data.tokens[token] = { createdBy: normalize(creator), createdAt: Date.now(), used: false, usedBy: null }
    savePremium(data)
    return { success: true, token }
}

export function redeemPremiumToken(sender, token) {
    const data = loadPremium()
    const num = normalize(sender)
    if (!data.tokens[token]) return { success: false, message: '❌ Token inválido' }
    if (data.tokens[token].used) return { success: false, message: '❌ Token ya canjeado' }
    if (data.users[num]) return { success: false, message: '❌ Ya eres premium' }
    
    data.tokens[token].used = true
    data.tokens[token].usedBy = num
    data.users[num] = { registeredAt: Date.now(), token, expiresAt: null }
    savePremium(data)
    setBotConfig(sender, getDefaultConfig())
    return { success: true, message: '✅ ¡Felicidades! Ahora eres usuario premium\n\nPuedes personalizar tu bot con:\n.setnamebot\n.setchannel\n.setlogo\netc.' }
}

export function getDefaultConfig() {
    return {
        namebot: 'Asta Bot',
        channel: 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21',
        IDchannel: '120363399175402285@newsletter',
        grupo: 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC',
        comunidad: 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO',
        icono: 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg',
        logo: 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg',
        firma: '© Asta Bot - Todos los derechos reservados'
    }
}

export function setBotConfig(botNumber, config) {
    const data = loadBots()
    const num = normalize(botNumber)
    if (!data.bots[num]) data.bots[num] = { createdAt: Date.now(), config: getDefaultConfig() }
    Object.assign(data.bots[num].config, config)
    saveBots(data)
    return { success: true, message: '✅ Configuración actualizada' }
}

export function getBotConfig(botNumber) {
    const data = loadBots()
    const num = normalize(botNumber)
    if (!data.bots[num]?.config) return getDefaultConfig()
    return data.bots[num].config
}

export function applyPremiumConfig(botNumber) {
    const num = normalize(botNumber)
    if (!isPremium(num) && !isSubbotPremium(num)) return false
    const botConfig = getBotConfig(num)
    if (botConfig.namebot) global.namebot = botConfig.namebot
    if (botConfig.channel) global.channel = botConfig.channel
    if (botConfig.IDchannel) global.IDchannel = botConfig.IDchannel
    if (botConfig.grupo) global.grupo = botConfig.grupo
    if (botConfig.comunidad) global.comunidad = botConfig.comunidad
    if (botConfig.icono) global.icono = botConfig.icono
    if (botConfig.logo) global.logo = botConfig.logo
    if (botConfig.firma) global.firma = botConfig.firma
    return true
}

export function applySubbotConfig(botNumber, premiumOwner) {
    const botNum = normalize(botNumber)
    const ownerNum = normalize(premiumOwner)
    
    if (!isSubbotPremium(botNum)) return false
    if (!isAllowedSubbot(botNum, ownerNum)) return false
    
    const ownerConfig = getBotConfig(ownerNum)
    const subbotConfig = getBotConfig(botNum)
    
    const finalConfig = { ...getDefaultConfig(), ...ownerConfig, ...subbotConfig }
    
    if (finalConfig.namebot) global.namebot = finalConfig.namebot
    if (finalConfig.channel) global.channel = finalConfig.channel
    if (finalConfig.IDchannel) global.IDchannel = finalConfig.IDchannel
    if (finalConfig.grupo) global.grupo = finalConfig.grupo
    if (finalConfig.comunidad) global.comunidad = finalConfig.comunidad
    if (finalConfig.icono) global.icono = finalConfig.icono
    if (finalConfig.logo) global.logo = finalConfig.logo
    if (finalConfig.firma) global.firma = finalConfig.firma
    
    return true
}

export function resetToDefaultConfig() {
    const def = getDefaultConfig()
    global.namebot = def.namebot
    global.channel = def.channel
    global.IDchannel = def.IDchannel
    global.grupo = def.grupo
    global.comunidad = def.comunidad
    global.icono = def.icono
    global.logo = def.logo
    global.firma = def.firma
}

export function setSubbotPremium(ownerNumber, targetNumber) {
    const data = loadSubprem()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    if (isSubbotPremium(targetNum)) return { success: false, message: '❌ Este número ya tiene sub-bot premium' }
    
    data.subbots[targetNum] = { registeredBy: ownerNum, registeredAt: Date.now(), isPremium: true }
    saveSubprem(data)
    return { success: true, message: `✅ @${targetNum} ahora tiene sub-bot premium`, mentions: [targetNumber] }
}

export function removeSubbotPremium(ownerNumber, targetNumber) {
    const data = loadSubprem()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    if (!data.subbots[targetNum]) return { success: false, message: '❌ Este número no tiene sub-bot premium' }
    
    delete data.subbots[targetNum]
    saveSubprem(data)
    return { success: true, message: `✅ Sub-bot premium removido` }
}

export function listTokens(requester) {
    if (!isGlobalOwner(requester)) return { success: false, message: '❌ Solo owners globales' }
    const data = loadPremium()
    const tokens = Object.entries(data.tokens)
        .filter(([_, info]) => !info.used)
        .map(([token, info]) => ({ token, created: new Date(info.createdAt).toLocaleString() }))
    return { success: true, tokens }
}

export function listPremiumUsers(requester) {
    if (!isGlobalOwner(requester)) return { success: false, message: '❌ Solo owners globales' }
    const data = loadPremium()
    return { 
        success: true, 
        users: Object.entries(data.users).map(([num, info]) => ({
            number: num,
            registered: new Date(info.registeredAt).toLocaleString()
        }))
    }
}

export function listAllSubprem(requester) {
    if (!isGlobalOwner(requester)) return { success: false, message: '❌ Solo owners globales' }
    const data = loadSubprem()
    return {
        success: true,
        subbots: Object.entries(data.subbots).map(([num, info]) => ({
            number: num,
            registeredBy: info.registeredBy,
            registered: new Date(info.registeredAt).toLocaleString()
        }))
    }
}

export function loadPremiumUsers() {
    return loadPremium().users
}

export function savePremiumUsers(users) {
    const data = loadPremium()
    data.users = users
    savePremium(data)
}

export function loadTokens() {
    return loadPremium().tokens
}

export function saveTokens(tokens) {
    const data = loadPremium()
    data.tokens = tokens
    savePremium(data)
}