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

// ==================== MIDDLEWARE ====================
app.use(cors({ origin: "*", credentials: true }))

// Middleware para loguear todas las peticiones
app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`)
    next()
})
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
// Debug: mostrar ruta estática
const publicPath = path.join(__dirname, '..', 'src', 'public')
console.log('📁 Sirviendo archivos estáticos desde:', publicPath)
console.log('📁 __dirname:', __dirname)
app.use(express.static(publicPath))

// También servir desde la raíz del proyecto como fallback
app.use('/css', express.static(path.join(__dirname, '..', 'src', 'public', 'css')))
app.use('/js', express.static(path.join(__dirname, '..', 'src', 'public', 'js')))
app.use('/uploads', express.static(path.join(__dirname, '..', 'src', 'public', 'uploads')))

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
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'astabot.verify@gmail.com',
                pass: process.env.EMAIL_PASS || 'asta-bot-2024'
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
    const { secret, owner, role = 'user' } = req.body
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

    const shortToken = generateShortToken()
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
    if (l