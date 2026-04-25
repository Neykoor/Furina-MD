import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import {
    startWebConnection,
    getWebConnectionStatus,
    cancelWebConnection,
    generateQRBuffer,
    getPairingCode,
    linkWebSubBotToUser,
    getSubConfig,
    saveSubConfig,
    cleanSubBotCache,
    isSubBotConnected,
    cleanNum
} from './serbot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const PORT = process.env.PORT || 24683
const HOST = '0.0.0.0'

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
})

// ==================== DATA STORAGE ====================
const activeSessions = new Map()
const webTokens = new Map()
const webUsers = new Map()
const emailVerifications = new Map()
const defaultLogos = new Map()

const USERS_FILE = './data/webusers.json'
const TOKENS_FILE = './data/webtokens.json'
const WELCOME_CONFIGS_FILE = './data/welcome-configs.json'
const LOGOS_FILE = './data/logos.json'

// Default logos configuration
const DEFAULT_LOGOS = {
    menu: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg',
    gacha: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg',
    grupo: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg',
    welcome: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg'
}

function loadData() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
            data.forEach(u => webUsers.set(u.username, u))
        }
        if (fs.existsSync(TOKENS_FILE)) {
            const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'))
            data.forEach(t => webTokens.set(t.token, t))
        }
        if (fs.existsSync(LOGOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(LOGOS_FILE, 'utf-8'))
            Object.entries(data).forEach(([k, v]) => defaultLogos.set(k, v))
        } else {
            Object.entries(DEFAULT_LOGOS).forEach(([k, v]) => defaultLogos.set(k, v))
        }
    } catch (e) { console.error('Error cargando datos web:', e) }
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify([...webUsers.values()], null, 2))
}

function saveTokens() {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify([...webTokens.values()], null, 2))
}

function saveLogos() {
    const obj = {}
    defaultLogos.forEach((v, k) => obj[k] = v)
    fs.writeFileSync(LOGOS_FILE, JSON.stringify(obj, null, 2))
}

function loadWelcomeConfigs() {
    try {
        if (fs.existsSync(WELCOME_CONFIGS_FILE)) {
            return JSON.parse(fs.readFileSync(WELCOME_CONFIGS_FILE, 'utf-8'))
        }
    } catch (e) { console.error('Error cargando welcome configs:', e) }
    return {}
}

function saveWelcomeConfigs(configs) {
    try {
        fs.mkdirSync(path.dirname(WELCOME_CONFIGS_FILE), { recursive: true })
        fs.writeFileSync(WELCOME_CONFIGS_FILE, JSON.stringify(configs, null, 2))
    } catch (e) { console.error('Error guardando welcome configs:', e) }
}

loadData()

// Generar token de owner para autenticación bot->web si no existe
if (!global.webAdminToken) {
    global.webAdminToken = crypto.randomBytes(32).toString('hex')
}

// ==================== MIDDLEWARE ====================
app.use(cors({ origin: "*", credentials: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'src', 'public')))

// ==================== AUTH MIDDLEWARE ====================
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || req.cookies?.token
    if (!token || !activeSessions.has(token)) {
        return res.status(401).json({ error: 'No autorizado', code: 'NO_AUTH' })
    }
    req.user = activeSessions.get(token)
    req.token = token
    next()
}

const requireRole = (role) => (req, res, next) => {
    if (req.user.role !== role && req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Acceso denegado' })
    }
    next()
}

// ==================== UTILS ====================
function hashPassword(pwd) {
    return crypto.createHash('sha256').update(pwd + 'asta-salt-2024').digest('hex')
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex')
}

function generateShortToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `ASTA-${code}`
}

function generateEmailCode() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

function getSubBotSocket(username) {
    const cleanUser = cleanNum(username)
    for (const [jid, sock] of global.subBots || []) {
        const cfg = sock.subConfig || getSubConfig(jid)
        const ownerClean = cleanNum(cfg?.owner)
        if (ownerClean === cleanUser || cfg?.owner === username) {
            return { jid, sock, config: cfg }
        }
    }
    return null
}

function getAllSubBots() {
    const bots = []
    for (const [jid, sock] of global.subBots || []) {
        if (!sock?.user) continue
        const cfg = sock.subConfig || getSubConfig(jid)
        bots.push({
            jid,
            name: sock.user?.name || cfg?.name || 'Unknown',
            number: cleanNum(jid),
            status: sock.ws?.readyState === 1 ? 'connected' : 'disconnected',
            owner: cfg?.owner || 'Unknown',
            uptime: process.uptime(),
            config: cfg
        })
    }
    return bots
}

// ==================== EMAIL SERVICE ====================
async function sendVerificationEmail(email, code) {
    try {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'soporte.study.bot',
                pass: process.env.EMAIL_PASS || 'agus280809'
            }
        })

        await transporter.sendMail({
            from: 'Asta Bot Verification <astabot.verify@gmail.com>',
            to: email,
            subject: '🔐 Código de Verificación - Asta Bot',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F19; color: #F1F5F9; padding: 40px; border-radius: 16px; border: 1px solid #1E293B;">
                    <h1 style="color: #06B6D4; text-align: center; font-family: Orbitron;">🔐 ASTA BOT</h1>
                    <p style="text-align: center; color: #94A3B8;">Tu código de verificación es:</p>
                    <div style="background: linear-gradient(135deg, #06B6D4, #0EA5E9); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px;">${code}</span>
                    </div>
                    <p style="text-align: center; color: #64748B; font-size: 14px;">Este código expira en 10 minutos.</p>
                    <p style="text-align: center; color: #64748B; font-size: 12px;">Si no solicitaste este código, ignora este mensaje.</p>
                </div>
            `
        })
        return true
    } catch (e) {
        console.error('Error enviando email:', e)
        return false
    }
}

// ==================== AI CONFIGURATION ====================
const AI_CONFIGS = [
    {
        name: 'Primary',
        key: 'sk-q7Y22pUkANXdqJRwnEVqfWQcvrA1UPxemAnChLmMlAEpN6zU1wFztlJKhoclm7IeoK_iDJaf2QFczOg',
        url: 'https://api.routeway.ai/v1/chat/completions',
        model: 'llama-3.3-70b-instruct:free'
    },
    {
        name: 'Secondary',
        key: 'sk-yDpbFiicXXqW7QWNPfhHJlg3LvZBuKS0qelLMt5HJQyl72K3CB35eB3kiha5eJKq-qmQc8qoHPGxlV569aeCxfo',
        url: 'https://api.routeway.ai/v1/chat/completions',
        model: 'llama-3.3-70b-instruct:free'
    },
    {
        name: 'Tertiary',
        key: 'sk-aYtfRulTFY4ktguZSpp0ic8l7HFsr2U_mXqsRzLgw_ZpGK5RmSlzWe_L8ZWItg',
        url: 'https://api.routeway.ai/v1/chat/completions',
        model: 'nemotron-3-nano-30b-a3b:free'
    }
]

async function callAI(messages, configIndex = 0) {
    if (configIndex >= AI_CONFIGS.length) {
        return { error: 'Todos los servicios de IA están fuera de servicio' }
    }

    const config = AI_CONFIGS[configIndex]
    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.key}`
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return { success: true, data, config: config.name }
    } catch (e) {
        console.log(`AI ${config.name} failed, trying next...`)
        return callAI(messages, configIndex + 1)
    }
}

// ==================== PUBLIC API ====================
app.get('/api/info', (req, res) => {
    const owners = (global.owner || []).map(o => {
        const num = Array.isArray(o) ? o[0] : o
        const name = Array.isArray(o) ? o[1] : 'Owner'
        return { number: num, name }
    })

    const stats = {
        totalBots: global.subBots?.size || 0,
        totalUsers: webUsers.size,
        uptime: process.uptime(),
        version: global.version || '2.0.0'
    }

    res.json({
        success: true,
        name: global.namebot || 'Asta Bot',
        logo: global.logo || DEFAULT_LOGOS.menu,
        icono: global.icono || DEFAULT_LOGOS.menu,
        description: global.description || 'Bot WhatsApp 24/7 con sistema de Sub-Bots y Web Dashboard',
        owners,
        stats,
        features: [
            'Sub-Bots 24/7',
            'Panel Web de Control',
            'Gestión de Grupos',
            'Sistema Premium',
            'Juegos RPG & Gacha',
            'IA Integrada',
            'Verificación por Email'
        ]
    })
})

// ==================== TOKEN SYSTEM ====================
app.post('/api/tokens/create', (req, res) => {
    const { secret, owner, role = 'user', token: externalToken } = req.body
    if (secret !== global.webSecret && secret !== 'asta-web-2024') {
        return res.status(403).json({ error: 'Secret inválido' })
    }

    // Clean old tokens
    const now = Date.now()
    for (const [token, data] of webTokens) {
        if (now - data.createdAt > 24 * 60 * 60 * 1000) {
            webTokens.delete(token)
        }
    }

    // Usar token externo si se proporciona (desde bot), o generar uno nuevo
    const shortToken = externalToken && /^ASTA-[A-Z0-9]{5}$/.test(externalToken) 
        ? externalToken 
        : generateShortToken()

    // Verificar que no exista ya
    if (webTokens.has(shortToken)) {
        return res.status(409).json({ error: 'Token ya existe' })
    }

    webTokens.set(shortToken, {
        token: shortToken,
        owner: cleanNum(owner),
        role,
        createdAt: now,
        used: false
    })
    saveTokens()

    res.json({ success: true, token: shortToken, expiresIn: '24h' })
})

app.get('/api/tokens/verify/:token', (req, res) => {
    const t = webTokens.get(req.params.token)
    if (!t) return res.json({ valid: false, error: 'Token no existe' })
    if (t.used) return res.json({ valid: false, error: 'Token ya usado' })

    // Check expiration
    if (Date.now() - t.createdAt > 24 * 60 * 60 * 1000) {
        webTokens.delete(req.params.token)
        return res.json({ valid: false, error: 'Token expirado' })
    }

    res.json({ valid: true, owner: t.owner, role: t.role })
})

// ==================== EMAIL VERIFICATION ====================
app.post('/api/email/send-code', async (req, res) => {
    const { email } = req.body
    if (!email || !email.includes('@')) {
        return res.json({ success: false, error: 'Email inválido' })
    }

    const code = generateEmailCode()
    emailVerifications.set(email, {
        code,
        createdAt: Date.now(),
        verified: false
    })

    const sent = await sendVerificationEmail(email, code)
    if (sent) {
        res.json({ success: true, message: 'Código enviado a tu correo' })
    } else {
        res.json({ success: false, error: 'No se pudo enviar el email' })
    }
})

app.post('/api/email/verify', (req, res) => {
    const { email, code } = req.body
    const verification = emailVerifications.get(email)

    if (!verification) {
        return res.json({ success: false, error: 'No hay código pendiente para este email' })
    }

    if (Date.now() - verification.createdAt > 10 * 60 * 1000) {
        emailVerifications.delete(email)
        return res.json({ success: false, error: 'Código expirado, solicita uno nuevo' })
    }

    if (verification.code !== code) {
        return res.json({ success: false, error: 'Código incorrecto' })
    }

    verification.verified = true
    res.json({ success: true, message: 'Email verificado correctamente' })
})

// ==================== AUTHENTICATION ====================
app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regToken, email } = req.body

    if (!username || !password || !regToken) {
        return res.json({ success: false, error: 'Faltan datos requeridos' })
    }

    const t = webTokens.get(regToken)
    if (!t) return res.json({ success: false, error: 'Token inválido' })
    if (t.used) return res.json({ success: false, error: 'Token ya usado' })

    const cleanUser = cleanNum(username)
    if (webUsers.has(cleanUser)) {
        return res.json({ success: false, error: 'Usuario ya existe' })
    }

    webUsers.set(cleanUser, {
        username: cleanUser,
        password: hashPassword(password),
        role: t.role,
        owner: t.owner,
        email: email || null,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        money: 0,
        profile: {
            phone: cleanUser,
            bio: '',
            avatar: ''
        }
    })

    t.used = true
    saveUsers()
    saveTokens()

    const sessionToken = generateToken()
    activeSessions.set(sessionToken, {
        username: cleanUser,
        role: t.role,
        createdAt: new Date()
    })

    res.json({
        success: true,
        token: sessionToken,
        username: cleanUser,
        role: t.role
    })
})

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    const cleanUser = cleanNum(username)
    const user = webUsers.get(cleanUser)

    if (!user || user.password !== hashPassword(password)) {
        return res.json({ success: false, error: 'Credenciales inválidas' })
    }

    const token = generateToken()
    activeSessions.set(token, {
        username: cleanUser,
        role: user.role,
        createdAt: new Date()
    })

    res.json({
        success: true,
        token,
        username: cleanUser,
        role: user.role
    })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username)
    res.json({
        success: true,
        user: {
            username: user.username,
            role: user.role,
            money: user.money || 0,
            profile: user.profile || {},
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt
        }
    })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
    activeSessions.delete(req.token)
    res.json({ success: true })
})

// ==================== PROFILE ====================
app.get('/api/profile', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json({
        success: true,
        profile: {
            username: user.username,
            phone: user.profile?.phone || user.username,
            role: user.role,
            money: user.money || 0,
            bio: user.profile?.bio || '',
            avatar: user.profile?.avatar || '',
            email: user.email,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            botLinked: !!getSubBotSocket(user.username)
        }
    })
})

app.post('/api/profile/update', requireAuth, (req, res) => {
    const { bio, avatar, email } = req.body
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    if (bio !== undefined) user.profile.bio = bio
    if (avatar !== undefined) user.profile.avatar = avatar
    if (email !== undefined && email.includes('@')) user.email = email

    saveUsers()
    res.json({ success: true, profile: user.profile })
})

// ==================== DASHBOARD API ====================
app.get('/api/dashboard', requireAuth, async (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) {
        return res.json({
            success: true,
            hasBot: false,
            message: 'No tienes un Sub-Bot vinculado. Usa #qr o #code en WhatsApp para vincular tu bot.'
        })
    }

    const { jid, sock, config } = subData
    const wsState = sock.ws?.readyState
    const isConnected = wsState === 1

    let groups = []
    if (isConnected) {
        try {
            const allGroups = await sock.groupFetchAllParticipating()
            for (const [gJid, meta] of Object.entries(allGroups)) {
                const me = meta.participants.find(p => p.id === sock.user?.jid)
                groups.push({
                    jid: gJid,
                    name: meta.subject,
                    participants: meta.participants.length,
                    isAdmin: me?.admin === 'admin' || me?.admin === 'superadmin',
                    isOwner: meta.owner === sock.user?.jid,
                    desc: meta.desc || ''
                })
            }
        } catch (e) { console.error('Error grupos:', e) }
    }

    res.json({
        success: true,
        hasBot: true,
        bot: {
            jid,
            name: sock.user?.name || config.name || 'Sub-Bot',
            number: cleanNum(jid),
            status: isConnected ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            config: {
                mode: config.mode || 'public',
                antiPrivate: config.antiPrivate || false,
                antiSpam: config.antiSpam !== false,
                cooldown: config.cooldown || 3000
            },
            groups
        }
    })
})

app.post('/api/dashboard/config', requireAuth, (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    const { name, mode, antiPrivate, antiSpam, cooldown, logoUrl } = req.body
    const updates = {}

    if (name) updates.name = name.slice(0, 30)
    if (mode && ['public', 'private'].includes(mode)) updates.mode = mode
    if (typeof antiPrivate === 'boolean') updates.antiPrivate = antiPrivate
    if (typeof antiSpam === 'boolean') updates.antiSpam = antiSpam
    if (cooldown) updates.cooldown = parseInt(cooldown)
    if (logoUrl && logoUrl.startsWith('http')) updates.logoUrl = logoUrl

    const newConfig = saveSubConfig(subData.jid, updates)
    res.json({ success: true, config: newConfig })
})

// ==================== LOGOS SYSTEM ====================
app.get('/api/logos', (req, res) => {
    const logos = {}
    defaultLogos.forEach((v, k) => logos[k] = v)
    res.json({ success: true, logos })
})

app.get('/api/logos/default', (req, res) => {
    res.json({ success: true, logos: DEFAULT_LOGOS })
})

app.post('/api/dashboard/logo', requireAuth, async (req, res) => {
    const { username } = req.user
    const { zone, imageBase64, useDefault } = req.body
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
        if (useDefault && DEFAULT_LOGOS[zone]) {
            const logos = { ...(subData.config.logos || {}) }
            logos[zone] = DEFAULT_LOGOS[zone]
            saveSubConfig(subData.jid, { logos })
            return res.json({ success: true, url: DEFAULT_LOGOS[zone], zone })
        }

        if (!imageBase64) return res.status(400).json({ error: 'No se proporcionó imagen' })

        const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        const fileName = `logo_${zone}_${Date.now()}.png`
        const logoPath = path.join(process.cwd(), 'src', 'public', 'uploads', fileName)

        if (!fs.existsSync(path.dirname(logoPath))) {
            fs.mkdirSync(path.dirname(logoPath), { recursive: true })
        }

        fs.writeFileSync(logoPath, buffer)
        const publicUrl = `/uploads/${fileName}`

        const logos = { ...(subData.config.logos || {}) }
        logos[zone] = publicUrl
        saveSubConfig(subData.jid, { logos })

        res.json({ success: true, url: publicUrl, zone })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/api/dashboard/logo/delete', requireAuth, (req, res) => {
    const { username } = req.user
    const { zone } = req.body
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    const logos = { ...(subData.config.logos || {}) }
    delete logos[zone]
    saveSubConfig(subData.jid, { logos })

    res.json({ success: true, message: 'Logo eliminado' })
})

// ==================== GROUPS & WELCOME ====================
app.post('/api/dashboard/leave-group', requireAuth, async (req, res) => {
    const { username } = req.user
    const { groupJid } = req.body
    const subData = getSubBotSocket(username)

    if (!subData?.sock) return res.status(404).json({ error: 'Sub-bot no conectado' })

    try {
        await subData.sock.groupLeave(groupJid)
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/api/dashboard/group/:jid', requireAuth, async (req, res) => {
    const { username } = req.user
    const groupJid = decodeURIComponent(req.params.jid)
    const subData = getSubBotSocket(username)

    if (!subData?.sock) return res.status(404).json({ error: 'Sub-bot no conectado' })

    try {
        const meta = await subData.sock.groupMetadata(groupJid)
        const me = meta.participants.find(p => p.id === subData.sock.user?.jid)

        res.json({
            success: true,
            group: {
                jid: groupJid,
                name: meta.subject,
                desc: meta.desc || '',
                owner: meta.owner,
                participants: meta.participants.map(p => ({
                    id: p.id,
                    admin: p.admin,
                    name: p.id.split('@')[0]
                })),
                me: {
                    isAdmin: me?.admin === 'admin' || me?.admin === 'superadmin',
                    isSuperAdmin: me?.admin === 'superadmin'
                }
            }
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => {
    const configs = loadWelcomeConfigs()
    const groupJid = req.params.groupJid
    const cfg = configs[groupJid] || {}

    res.json({
        success: true,
        config: {
            activo: cfg.activo !== false,
            caption: cfg.caption || '👋 ¡Bienvenido @{numero} a *{grupo}*!\nYa somos *{miembros}* miembros.',
            captionBye: cfg.captionBye || '👋 @{numero} ha salido de *{grupo}*. ¡Hasta pronto!',
            avatarX: cfg.avatarX || 130,
            avatarY: cfg.avatarY || 200,
            avatarRadius: cfg.avatarRadius || 90,
            borderColor: cfg.borderColor || '#00e5ff',
            titleText: cfg.titleText || '¡Bienvenido!',
            titleColor: cfg.titleColor || '#00e5ff',
            nameColor: cfg.nameColor || '#ffffff',
            groupColor: cfg.groupColor || '#cccccc',
            membersColor: cfg.membersColor || '#aaaaaa',
            backgroundImage: cfg.backgroundImage || '',
            variables: ['{numero}', '{grupo}', '{miembros}', '{nombre}']
        }
    })
})

app.post('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => {
    const groupJid = req.params.groupJid
    const configs = loadWelcomeConfigs()

    configs[groupJid] = {
        ...configs[groupJid],
        ...req.body,
        updatedAt: new Date().toISOString()
    }

    saveWelcomeConfigs(configs)
    res.json({ success: true, config: configs[groupJid] })
})

// ==================== BOT MANAGEMENT ====================
app.post('/api/dashboard/bot/restart', requireAuth, async (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
        const num = cleanNum(subData.jid)

        if (subData.sock) {
            subData.sock.ev?.removeAllListeners()
            if (subData.sock.ws?.readyState === 1) subData.sock.ws.close()
        }

        await cleanSubBotCache(num)
        await new Promise(r => setTimeout(r, 3000))

        await startWebConnection(num, 'qr', {
            onConnected: (info) => {
                console.log('Bot reiniciado:', info)
            },
            onError: (err) => {
                console.error('Error reinicio:', err)
            }
        })

        res.json({ success: true, message: 'Bot reiniciado correctamente' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/api/dashboard/bot/delete', requireAuth, (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
        const num = cleanNum(subData.jid)
        const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', num)

        if (subData.sock) {
            subData.sock.ev?.removeAllListeners()
            if (subData.sock.ws) subData.sock.ws.close()
        }

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }

        global.subBots.delete(subData.jid)
        global.subBots.delete(num)
        global.subBotsData.delete(subData.jid)
        global.subBotsData.delete(num)

        res.json({ success: true, message: 'Bot eliminado permanentemente' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/api/dashboard/bot/clear-cache', requireAuth, async (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
        const num = cleanNum(subData.jid)
        await cleanSubBotCache(num)
        res.json({ success: true, message: 'Caché limpiada correctamente' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== REQUEST BOT ====================
app.post('/api/request-bot', async (req, res) => {
    const { type, phoneNumber } = req.body

    if (!phoneNumber) {
        return res.json({ success: false, error: 'Número requerido' })
    }

    const cleanPhone = cleanNum(phoneNumber)

    if (isSubBotConnected(cleanPhone)) {
        return res.json({ success: false, error: 'Este número ya tiene un bot activo' })
    }

    try {
        if (type === 'code') {
            const controller = await startWebConnection(cleanPhone, 'code', {
                onCode: (formatted, raw) => { },
                onConnected: (info) => {
                    console.log('Web bot conectado:', info)
                },
                onError: (err) => {
                    console.error('Error web bot:', err)
                },
                onTimeout: () => {
                    console.log('Timeout web bot')
                }
            })

            let attempts = 0
            const maxAttempts = 30
            let codeInfo = null

            while (attempts < maxAttempts) {
                codeInfo = getPairingCode(cleanPhone)
                if (codeInfo) break
                await new Promise(r => setTimeout(r, 1000))
                attempts++
            }

            if (!codeInfo) {
                cancelWebConnection(cleanPhone)
                return res.json({ success: false, error: 'Tiempo agotado generando código' })
            }

            res.json({
                success: true,
                type: 'code',
                code: codeInfo.formatted,
                rawCode: codeInfo.raw,
                phoneNumber: cleanPhone,
                expiresIn: Math.floor((codeInfo.expiresAt - Date.now()) / 1000),
                instructions: 'Abre WhatsApp > ⋮ > Dispositivos vinculados > Vincular con código'
            })

        } else {
            const controller = await startWebConnection(cleanPhone, 'qr', {
                onQR: (qrData, qrBase64) => { },
                onConnected: (info) => {
                    console.log('Web QR bot conectado:', info)
                },
                onError: (err) => {
                    console.error('Error QR web:', err)
                },
                onTimeout: () => {
                    console.log('Timeout QR web')
                }
            })

            let attempts = 0
            const maxAttempts = 20
            let qrBuffer = null

            while (attempts < maxAttempts) {
                qrBuffer = await generateQRBuffer(cleanPhone)
                if (qrBuffer) break
                await new Promise(r => setTimeout(r, 1000))
                attempts++
            }

            if (!qrBuffer) {
                cancelWebConnection(cleanPhone)
                return res.json({ success: false, error: 'Tiempo agotado generando QR' })
            }

            const requestId = crypto.randomBytes(16).toString('hex')
            const qrFile = `qr_${requestId}.png`
            const qrPath = path.join(process.cwd(), 'src', 'public', 'uploads', qrFile)

            if (!fs.existsSync(path.dirname(qrPath))) {
                fs.mkdirSync(path.dirname(qrPath), { recursive: true })
            }

            fs.writeFileSync(qrPath, qrBuffer)

            res.json({
                success: true,
                requestId,
                type: 'qr',
                qrUrl: `/uploads/${qrFile}`,
                phoneNumber: cleanPhone,
                expiresIn: 45
            })
        }
    } catch (e) {
        cancelWebConnection(cleanPhone)
        res.status(500).json({ success: false, error: e.message })
    }
})

// ==================== AI CHATBOT ====================
app.post('/api/ai/chat', requireAuth, async (req, res) => {
    const { message, context = [] } = req.body
    const { username } = req.user

    if (!message) return res.status(400).json({ error: 'Mensaje requerido' })

    const subData = getSubBotSocket(username)
    const hasBot = !!subData

    // Build system prompt with bot info
    let systemPrompt = `Eres Asta Bot, un asistente virtual inteligente para WhatsApp. Ayudas a los usuarios con sus bots y respondes preguntas.`

    if (hasBot) {
        systemPrompt += `\n\nEl usuario tiene un bot vinculado (${subData.sock?.user?.name || 'Sub-Bot'}). Puedes ayudarle a gestionarlo.`
    } else {
        systemPrompt += `\n\nEl usuario NO tiene un bot vinculado. Dile que use #qr o #code en WhatsApp para vincular uno.`
    }

    systemPrompt += `\n\nComandos disponibles: #menu, #help, #qr, #code, #token, #dashboard`
    systemPrompt += `\nResponde de forma amigable y útil. Si no sabes algo, di que no tienes esa información.`

    const messages = [
        { role: 'system', content: systemPrompt },
        ...context.slice(-5),
        { role: 'user', content: message }
    ]

    const result = await callAI(messages)

    if (result.success) {
        res.json({
            success: true,
            response: result.data.choices[0].message.content,
            model: result.config
        })
    } else {
        res.status(500).json({ error: result.error })
    }
})

app.post('/api/ai/analyze', requireAuth, requireRole('owner'), async (req, res) => {
    const { files, prompt } = req.body

    const systemPrompt = `Eres un analista experto de código y sistemas. Analiza los documentos proporcionados y da recomendaciones detalladas.`

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analiza estos archivos y responde: ${prompt}\n\nArchivos: ${JSON.stringify(files)}` }
    ]

    const result = await callAI(messages)

    if (result.success) {
        res.json({
            success: true,
            analysis: result.data.choices[0].message.content,
            model: result.config
        })
    } else {
        res.status(500).json({ error: result.error })
    }
})

app.post('/api/ai/generate-command', requireAuth, requireRole('owner'), async (req, res) => {
    const { description, type = 'general' } = req.body

    const systemPrompt = `Eres un desarrollador experto de bots de WhatsApp usando Baileys y Node.js. Crea comandos completos y funcionales.`

    const prompt = `Crea un comando de WhatsApp bot con la siguiente descripción: "${description}"

Tipo: ${type}

El comando debe:
1. Exportar por defecto un objeto con: command, aliases, description, usage, category
2. Incluir manejo de permisos (owner, admin, group, botAdmin)
3. Usar async/await
4. Incluir manejo de errores con try-catch
5. Responder con sendMessage
6. Usar formato moderno ES6+

Devuelve SOLO el código, sin explicaciones.`

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
    ]

    const result = await callAI(messages)

    if (result.success) {
        res.json({
            success: true,
            code: result.data.choices[0].message.content,
            model: result.config
        })
    } else {
        res.status(500).json({ error: result.error })
    }
})

// ==================== DOWNLOAD API ====================
app.post('/api/download', requireAuth, async (req, res) => {
    const { url, type, quality = 'best' } = req.body

    if (!url) return res.status(400).json({ error: 'URL requerida' })

    const apis = global.Api || {
        youtube: 'https://api.yt-down.com/download',
        instagram: 'https://api.instagram-down.com/download',
        facebook: 'https://api.fb-down.com/download',
        tiktok: 'https://api.tt-down.com/download'
    }

    try {
        let apiUrl = ''
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            apiUrl = `${apis.youtube}?url=${encodeURIComponent(url)}&quality=${quality}`
        } else if (url.includes('instagram.com')) {
            apiUrl = `${apis.instagram}?url=${encodeURIComponent(url)}`
        } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
            apiUrl = `${apis.facebook}?url=${encodeURIComponent(url)}`
        } else if (url.includes('tiktok.com')) {
            apiUrl = `${apis.tiktok}?url=${encodeURIComponent(url)}`
        }

        if (!apiUrl) {
            return res.json({ success: false, error: 'URL no soportada. Usa YouTube, Instagram, Facebook o TikTok.' })
        }

        const response = await fetch(apiUrl)
        const data = await response.json()

        res.json({
            success: true,
            title: data.title || 'Descarga',
            url: data.downloadUrl || data.url,
            thumbnail: data.thumbnail,
            duration: data.duration,
            quality: data.quality || quality,
            type: type || 'video'
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==================== ADMIN ROUTES ====================
app.get('/api/admin/stats', requireAuth, requireRole('owner'), (req, res) => {
    const bots = getAllSubBots()

    res.json({
        success: true,
        stats: {
            totalBots: bots.length,
            connectedBots: bots.filter(b => b.status === 'connected').length,
            totalUsers: webUsers.size,
            activeSessions: activeSessions.size,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        },
        bots,
        logs: (global.webLogs || []).slice(-100)
    })
})

app.get('/api/admin/bots', requireAuth, requireRole('owner'), (req, res) => {
    res.json({ success: true, bots: getAllSubBots() })
})

app.post('/api/admin/bot/:jid/restart', requireAuth, requireRole('owner'), async (req, res) => {
    const { jid } = req.params
    const num = cleanNum(jid)
    const sock = global.subBots.get(jid) || global.subBots.get(num)

    try {
        if (sock) {
            sock.ev?.removeAllListeners()
            if (sock.ws?.readyState === 1) sock.ws.close()
        }

        await cleanSubBotCache(num)
        await new Promise(r => setTimeout(r, 2000))

        await startWebConnection(num, 'qr', {
            onConnected: () => { },
            onError: () => { }
        })

        res.json({ success: true, message: 'Bot reiniciado' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/api/admin/bot/:jid/reinstall', requireAuth, requireRole('owner'), (req, res) => {
    const { jid } = req.params
    const num = cleanNum(jid)
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', num)
    const nodeModulesPath = path.join(process.cwd(), 'node_modules')
    const packageLockPath = path.join(process.cwd(), 'package-lock.json')

    try {
        const sock = global.subBots.get(jid) || global.subBots.get(num)
        if (sock) {
            sock.ev?.removeAllListeners()
            if (sock.ws) sock.ws.close()
        }

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }

        if (fs.existsSync(packageLockPath)) {
            fs.unlinkSync(packageLockPath)
        }

        if (fs.existsSync(nodeModulesPath)) {
            fs.rmSync(nodeModulesPath, { recursive: true, force: true })
        }

        global.subBots.delete(jid)
        global.subBots.delete(num)
        global.subBotsData.delete(jid)
        global.subBotsData.delete(num)

        res.json({
            success: true,
            message: 'Módulos eliminados. Ejecuta npm install para reinstalar.'
        })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.delete('/api/admin/bot/:jid', requireAuth, requireRole('owner'), (req, res) => {
    const { jid } = req.params
    const num = cleanNum(jid)
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', num)

    try {
        const sock = global.subBots.get(jid) || global.subBots.get(num)
        if (sock) {
            sock.ev?.removeAllListeners()
            if (sock.ws) sock.ws.close()
        }

        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true })
        }

        global.subBots.delete(jid)
        global.subBots.delete(num)
        global.subBotsData.delete(jid)
        global.subBotsData.delete(num)

        res.json({ success: true, message: 'Bot eliminado permanentemente' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.get('/api/admin/users', requireAuth, requireRole('owner'), (req, res) => {
    const users = [...webUsers.values()].map(u => ({
        username: u.username,
        role: u.role,
        money: u.money || 0,
        createdAt: u.createdAt,
        createdBy: u.createdBy,
        profile: u.profile || {},
        email: u.email,
        emailVerified: u.emailVerified
    }))
    res.json({ success: true, users })
})

app.post('/api/admin/users', async (req, res) => {
    // Verificar auth por Bearer token de sesión O secret de owner
    const authHeader = req.headers.authorization || ''
    const bearerToken = authHeader.replace('Bearer ', '')
    const isValidSession = activeSessions.has(bearerToken)
    const isOwnerSecret = bearerToken === (global.webAdminToken || 'OWNER_SECRET')

    // Si no es sesión válida ni secret de owner, rechazar
    if (!isValidSession && !isOwnerSecret) {
        return res.status(401).json({ error: 'No autorizado' })
    }

    // Si es sesión, verificar rol owner/admin
    if (isValidSession) {
        const session = activeSessions.get(bearerToken)
        if (session.role !== 'owner' && session.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' })
        }
    }

    const { username, password, role = 'user' } = req.body
    const cleanUser = cleanNum(username)

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Faltan datos requeridos' })
    }

    if (webUsers.has(cleanUser)) {
        return res.json({ success: false, error: 'Usuario ya existe' })
    }

    webUsers.set(cleanUser, {
        username: cleanUser,
        password: hashPassword(password),
        role,
        money: 0,
        createdBy: isValidSession ? activeSessions.get(bearerToken).username : 'bot-owner',
        createdAt: new Date().toISOString(),
        profile: {
            phone: cleanUser,
            bio: '',
            avatar: ''
        }
    })

    saveUsers()
    res.json({ success: true, message: 'Usuario creado', username: cleanUser })
})

app.delete('/api/admin/users/:username', requireAuth, requireRole('owner'), (req, res) => {
    const cleanUser = cleanNum(req.params.username)
    if (!webUsers.has(cleanUser)) {
        return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    webUsers.delete(cleanUser)
    saveUsers()
    res.json({ success: true, message: 'Usuario eliminado' })
})

app.post('/api/admin/users/:username/money', requireAuth, requireRole('owner'), (req, res) => {
    const cleanUser = cleanNum(req.params.username)
    const { amount, action } = req.body
    const user = webUsers.get(cleanUser)

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const currentMoney = user.money || 0
    let newMoney = currentMoney

    switch (action) {
        case 'add':
            newMoney = currentMoney + parseInt(amount)
            break
        case 'remove':
            newMoney = Math.max(0, currentMoney - parseInt(amount))
            break
        case 'set':
            newMoney = parseInt(amount)
            break
        default:
            return res.status(400).json({ error: 'Acción inválida' })
    }

    user.money = newMoney
    saveUsers()

    res.json({
        success: true,
        user: {
            username: user.username,
            money: newMoney,
            previousMoney: currentMoney
        }
    })
})

app.post('/api/admin/exec', requireAuth, requireRole('owner'), async (req, res) => {
    const { target, command } = req.body
    const results = []

    if (target === 'all') {
        for (const [jid, sock] of global.subBots || []) {
            if (sock.ws?.readyState !== 1) continue
            try {
                results.push({ jid, status: 'executed' })
            } catch (e) {
                results.push({ jid, status: 'error', error: e.message })
            }
        }
    } else {
        const sock = global.subBots.get(target)
        if (sock && sock.ws?.readyState === 1) {
            try {
                results.push({ jid: target, status: 'executed' })
            } catch (e) {
                results.push({ jid: target, status: 'error', error: e.message })
            }
        }
    }

    res.json({ success: true, results })
})

// ==================== WEBSOCKET ====================
io.on('connection', (socket) => {
    console.log('🌐 Cliente conectado:', socket.id)

    socket.emit('info', {
        name: global.namebot || 'Asta Bot',
        logo: global.logo,
        icono: global.icono
    })

    socket.on('subscribe-logs', (token) => {
        const session = activeSessions.get(token)
        if (session?.role === 'owner') {
            socket.join('admin-logs')
            socket.emit('logs-subscribed', true)
        }
    })

    socket.on('disconnect', () => {
        console.log('🌐 Cliente desconectado:', socket.id)
    })
})

global.emitLog = (type, message, data = {}) => {
    io.to('admin-logs').emit('log', { type, message, data, time: new Date().toISOString() })
}

// ==================== ROUTES ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'public', 'index.html'))
})

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'public', 'login.html'))
})

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'public', 'dashboard.html'))
})

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'public', 'admin.html'))
})

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'public', 'chat.html'))
})

httpServer.listen(PORT, HOST, () => {
    console.log(`\n🌐 Asta Web iniciado`)
    console.log(`🔗 http://localhost:${PORT}`)
    console.log(`📁 Public: src/public/`)
})

export { app, io }
