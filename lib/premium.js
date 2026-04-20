import fs from 'fs'
import path from 'path'

// Crear carpeta lib/premium si no existe
const premiumDir = path.join(process.cwd(), 'lib', 'premium')
if (!fs.existsSync(premiumDir)) {
    fs.mkdirSync(premiumDir, { recursive: true })
}

const premiumFile = path.join(premiumDir, 'premium.json')
const subpremFile = path.join(premiumDir, 'subprem.json')
const botsFile = path.join(premiumDir, 'bots.json')
const allowedSubbotsFile = path.join(premiumDir, 'allowed_subbots.json')

// ============== FUNCIONES DE CARGA ==============

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

// ============== FUNCIONES DE GUARDADO ==============

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

// ============== FUNCIONES AUXILIARES ==============

function normalize(num) {
    return String(num).replace(/[^0-9]/g, '')
}

function isGlobalOwner(sender) {
    const num = normalize(sender)
    const owners = Array.isArray(global.owner) ? global.owner : []
    return owners.some(o => normalize(Array.isArray(o) ? o[0] : o) === num)
}

function isPremium(sender) {
    const data = loadPremium()
    const num = normalize(sender)
    return !!data.users[num]
}

function isSubbotPremium(botNumber) {
    const data = loadSubprem()
    const num = normalize(botNumber)
    return !!data.subbots[num]
}

function getPremiumInfo(sender) {
    const data = loadPremium()
    const num = normalize(sender)
    return data.users[num] || null
}

function getUserType(sender) {
    const num = normalize(sender)
    if (isGlobalOwner(num)) return 'global_owner'
    if (isPremium(num)) return 'premium'
    if (isSubbotPremium(num)) return 'subprem'
    return 'free'
}

// ============== FUNCIONES DE CONTROL DE SUB-BOTS PERMITIDOS ==============

function isAllowedSubbot(botNumber, ownerNumber) {
    const data = loadAllowedSubbots()
    const botNum = normalize(botNumber)
    const ownerNum = normalize(ownerNumber)
    
    // Si no hay restricciones para este owner, todos están permitidos (modo legacy)
    if (!data.allowed[ownerNum]) return true
    
    return data.allowed[ownerNum].includes(botNum)
}

function allowSubbot(ownerNumber, targetNumber) {
    const data = loadAllowedSubbots()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    
    if (!data.allowed[ownerNum]) {
        data.allowed[ownerNum] = []
    }
    
    if (data.allowed[ownerNum].includes(targetNum)) {
        return { success: false, message: '❌ Este sub-bot ya está permitido' }
    }
    
    data.allowed[ownerNum].push(targetNum)
    saveAllowedSubbots(data)
    
    return { success: true, message: `✅ Sub-bot @${targetNum} permitido para tu cuenta premium`, mentions: [targetNumber] }
}

function disallowSubbot(ownerNumber, targetNumber) {
    const data = loadAllowedSubbots()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)
    
    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }
    
    if (!data.allowed[ownerNum] || !data.allowed[ownerNum].includes(targetNum)) {
        return { success: false, message: '❌ Este sub-bot no está en tu lista de permitidos' }
    }
    
    data.allowed[ownerNum] = data.allowed[ownerNum].filter(num => num !== targetNum)
    saveAllowedSubbots(data)
    
    return { success: true, message: `✅ Sub-bot @${targetNum} removido de tu lista`, mentions: [targetNumber] }
}

function getAllowedSubbots(ownerNumber) {
    const data = loadAllowedSubbots()
    const ownerNum = normalize(ownerNumber)
    return data.allowed[ownerNum] || []
}

// ============== FUNCIONES DE TOKENS ==============

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = 'ASTA-'
    for (let i = 0; i < 5; i++) {
        token += chars[Math.floor(Math.random() * chars.length)]
    }
    return token
}

function createPremiumToken(creator) {
    if (!isGlobalOwner(creator)) {
        return { success: false, message: '❌ Solo owners globales pueden crear tokens' }
    }

    const data = loadPremium()
    const token = generateToken()

    data.tokens[token] = {
        createdBy: normalize(creator),
        createdAt: Date.now(),
        used: false,
        usedBy: null
    }

    savePremium(data)
    return { success: true, token }
}

function redeemPremiumToken(sender, token) {
    const data = loadPremium()
    const num = normalize(sender)

    if (!data.tokens[token]) {
        return { success: false, message: '❌ Token inválido' }
    }

    if (data.tokens[token].used) {
        return { success: false, message: '❌ Este token ya fue canjeado' }
    }

    if (data.users[num]) {
        return { success: false, message: '❌ Ya eres usuario premium' }
    }

    data.tokens[token].used = true
    data.tokens[token].usedBy = num

    data.users[num] = {
        registeredAt: Date.now(),
        token: token,
        expiresAt: null
    }

    savePremium(data)

    // Aplicar configuración por defecto
    setBotConfig(sender, getDefaultConfig())

    return { success: true, message: '✅ ¡Felicidades! Ahora eres usuario premium\n\nPuedes personalizar tu bot con:\n.setnamebot\n.setchannel\n.setlogo\netc.' }
}

// ============== FUNCIONES DE CONFIGURACIÓN ==============

function getDefaultConfig() {
    return {
        namebot: global.namebot || 'Asta Bot',
        channel: global.channel || '',
        IDchannel: global.IDchannel || '',
        grupo: global.grupo || '',
        comunidad: global.comunidad || '',
        icono: global.icono || '',
        logo: global.logo || '',
        firma: global.firma || '© Asta Bot - Todos los derechos reservados'
    }
}

function setBotConfig(botNumber, config) {
    const data = loadBots()
    const num = normalize(botNumber)

    if (!data.bots[num]) {
        data.bots[num] = {
            createdAt: Date.now(),
            config: getDefaultConfig()
        }
    }

    Object.assign(data.bots[num].config, config)
    saveBots(data)
    return { success: true, message: '✅ Configuración actualizada' }
}

function getBotConfig(botNumber) {
    const data = loadBots()
    const num = normalize(botNumber)

    if (!data.bots[num] || !data.bots[num].config) {
        return getDefaultConfig()
    }

    return data.bots[num].config
}

function applyPremiumConfig(botNumber) {
    const num = normalize(botNumber)
    const isPremiumBot = isPremium(num) || isSubbotPremium(num)

    if (!isPremiumBot) return false

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

function resetToDefaultConfig() {
    global.namebot = 'Asta Bot'
    global.channel = 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
    global.IDchannel = '120363399175402285@newsletter'
    global.grupo = 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC'
    global.comunidad = 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO'
    global.icono = 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg'
    global.logo = 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg'
    global.firma = '© Asta Bot - Todos los derechos reservados'
}

// ============== FUNCIONES DE SUB-BOTS ==============

function setSubbotPremium(ownerNumber, targetNumber) {
    const data = loadSubprem()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)

    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }

    if (isSubbotPremium(targetNum)) {
        return { success: false, message: '❌ Este número ya tiene sub-bot premium' }
    }

    data.subbots[targetNum] = {
        registeredBy: ownerNum,
        registeredAt: Date.now(),
        isPremium: true
    }

    saveSubprem(data)
    return { success: true, message: `✅ @${targetNum} ahora tiene sub-bot premium`, mentions: [targetNumber] }
}

function removeSubbotPremium(ownerNumber, targetNumber) {
    const data = loadSubprem()
    const ownerNum = normalize(ownerNumber)
    const targetNum = normalize(targetNumber)

    if (!isPremium(ownerNum) && !isGlobalOwner(ownerNum)) {
        return { success: false, message: '❌ Necesitas ser premium o owner global' }
    }

    if (!data.subbots[targetNum]) {
        return { success: false, message: '❌ Este número no tiene sub-bot premium' }
    }

    delete data.subbots[targetNum]
    saveSubprem(data)
    return { success: true, message: `✅ Sub-bot premium removido` }
}

// ============== FUNCIONES DE LISTADO ==============

function listTokens(requester) {
    if (!isGlobalOwner(requester)) {
        return { success: false, message: '❌ Solo owners globales' }
    }

    const data = loadPremium()
    const tokens = Object.entries(data.tokens)
        .filter(([_, info]) => !info.used)
        .map(([token, info]) => ({
            token,
            created: new Date(info.createdAt).toLocaleString()
        }))

    return { success: true, tokens }
}

function listPremiumUsers(requester) {
    if (!isGlobalOwner(requester)) {
        return { success: false, message: '❌ Solo owners globales' }
    }

    const data = loadPremium()
    return { 
        success: true, 
        users: Object.entries(data.users).map(([num, info]) => ({
            number: num,
            registered: new Date(info.registeredAt).toLocaleString()
        }))
    }
}

function listAllSubprem(requester) {
    if (!isGlobalOwner(requester)) {
        return { success: false, message: '❌ Solo owners globales' }
    }

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

// ============== EXPORTACIONES ==============

export {
    loadPremium,
    loadSubprem,
    loadBots,
    loadAllowedSubbots,
    savePremium,
    saveSubprem,
    saveBots,
    saveAllowedSubbots,
    normalize,
    isGlobalOwner,
    isPremium,
    isSubbotPremium,
    isAllowedSubbot,
    allowSubbot,
    disallowSubbot,
    getAllowedSubbots,
    getPremiumInfo,
    getUserType,
    generateToken,
    createPremiumToken,
    redeemPremiumToken,
    setBotConfig,
    getBotConfig,
    getDefaultConfig,
    applyPremiumConfig,
    resetToDefaultConfig,
    setSubbotPremium,
    removeSubbotPremium,
    listTokens,
    listPremiumUsers,
    listAllSubprem
}