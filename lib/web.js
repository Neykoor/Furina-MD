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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 24683
const HOST = '0.0.0.0'

const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'], credentials: true }
})

// ── In-memory stores ──────────────────────────────────────────
const activeSessions   = new Map()  // token → { username, role, createdAt }
const pendingEmailCodes = new Map() // email → { code, expires }
const tokenStore       = new Map()  // "ASTA-XXXXX" → { owner, role, used, expiresAt }

// ── Persistence files ─────────────────────────────────────────
const DATA_DIR           = path.join(process.cwd(), 'data')
const USERS_FILE         = path.join(DATA_DIR, 'webusers.json')
const TOKENS_FILE        = path.join(DATA_DIR, 'webtokens.json')
const WELCOME_FILE       = path.join(DATA_DIR, 'welcome-configs.json')
const BOT_SESSIONS_FILE  = path.join(DATA_DIR, 'bot-sessions.json')

fs.mkdirSync(DATA_DIR, { recursive: true })

// ── Helpers ───────────────────────────────────────────────────
const webUsers = new Map()

function loadJSON(file, fallback = []) {
    try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch {}
    return fallback
}
function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

function loadAllData() {
    loadJSON(USERS_FILE, []).forEach(u => webUsers.set(u.username, u))
    loadJSON(TOKENS_FILE, []).forEach(t => tokenStore.set(t.token, t))
}
loadAllData()

function saveUsers() { saveJSON(USERS_FILE, [...webUsers.values()]) }
function saveTokens() { saveJSON(TOKENS_FILE, [...tokenStore.values()]) }

function loadWelcomeConfigs()        { return loadJSON(WELCOME_FILE, {}) }
function saveWelcomeConfigs(cfg)     { saveJSON(WELCOME_FILE, cfg) }

function hashPwd(p) { return crypto.createHash('sha256').update(p + 'asta-salt-2024').digest('hex') }
function genSession() { return crypto.randomBytes(32).toString('hex') }

function cleanNum(n) {
    if (!n) return ''
    return String(n).replace(/[^0-9]/g, '')
}

/** Generate ASTA-XXXXX token and auto-expire after 24h */
function generateShortToken(owner, role = 'user') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let suffix = ''
    for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
    const token = `ASTA-${suffix}`
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    tokenStore.set(token, { token, owner: cleanNum(owner), role, used: false, createdAt: Date.now(), expiresAt })
    saveTokens()
    // Auto-expire
    setTimeout(() => {
        const t = tokenStore.get(token)
        if (t && !t.used) tokenStore.delete(token)
        saveTokens()
    }, 24 * 60 * 60 * 1000)
    return token
}

/** Refresh all tokens every 24h */
setInterval(() => {
    const now = Date.now()
    for (const [k, t] of tokenStore) {
        if (t.expiresAt && now > t.expiresAt && !t.used) tokenStore.delete(k)
    }
    saveTokens()
}, 60 * 60 * 1000)

function getSubBotSocket(username) {
    const num = cleanNum(username)
    if (!global.subBots) return null
    for (const [jid, sock] of global.subBots) {
        const cfg = sock.subConfig || {}
        const ownerNum = cleanNum(cfg.owner || '')
        if (ownerNum === num || cleanNum(jid) === num) return { jid, sock, config: cfg }
    }
    return null
}

function getAllSubBots() {
    const bots = []
    if (!global.subBots) return bots
    for (const [jid, sock] of global.subBots) {
        if (!sock?.user) continue
        const cfg = sock.subConfig || {}
        bots.push({
            jid,
            name: sock.user?.name || cfg.name || 'Sub-Bot',
            number: cleanNum(jid),
            status: sock.ws?.readyState === 1 ? 'connected' : 'disconnected',
            owner: cfg.owner || 'Unknown',
            config: cfg
        })
    }
    return bots
}

// ── Email helper ──────────────────────────────────────────────
async function sendEmailCode(email, code) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: global.emailUser || process.env.EMAIL_USER, pass: global.emailPass || process.env.EMAIL_PASS }
    })
    await transporter.sendMail({
        from: `"Asta Bot" <${global.emailUser || process.env.EMAIL_USER}>`,
        to: email,
        subject: '🤖 Código de verificación - Asta Bot',
        html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;background:#0f172a;color:#f1f5f9;border-radius:12px">
            <h2 style="color:#06b6d4">Asta Bot</h2>
            <p>Tu código de verificación es:</p>
            <div style="font-size:2rem;font-weight:bold;letter-spacing:8px;color:#06b6d4;margin:20px 0">${code}</div>
            <p style="color:#94a3b8;font-size:0.85rem">Expira en 10 minutos. No compartas este código.</p>
        </div>`
    })
}

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'src', 'public')))

const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token
    if (!token || !activeSessions.has(token)) return res.status(401).json({ error: 'No autorizado' })
    req.user = activeSessions.get(token)
    req.token = token
    next()
}
const requireRole = role => (req, res, next) => {
    if (req.user.role !== role && req.user.role !== 'owner') return res.status(403).json({ error: 'Acceso denegado' })
    next()
}

// ═════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═════════════════════════════════════════════════════════════

app.get('/api/info', (req, res) => {
    const owners = (global.owner || []).map(o => {
        const num = Array.isArray(o) ? o[0] : o
        const name = Array.isArray(o) ? o[1] : 'Owner'
        return { number: num, name }
    })
    res.json({
        success: true,
        name: global.namebot || 'Asta Bot',
        logo: global.logo || '',
        icono: global.icono || '',
        description: global.description || 'Bot WhatsApp 24/7',
        owners,
        stats: {
            totalBots: global.subBots?.size || 0,
            totalUsers: webUsers.size,
            uptime: process.uptime(),
            version: global.version || '2.0.0'
        },
        features: ['Sub-Bots 24/7','Panel Web','Gestión de Grupos','Sistema Premium','Juegos RPG & Gacha']
    })
})

// ── Token API ─────────────────────────────────────────────────
app.post('/api/tokens/create', (req, res) => {
    const { secret, owner, role = 'user' } = req.body
    if (secret !== global.webSecret && secret !== 'asta-web-2024') return res.status(403).json({ error: 'Secret inválido' })
    const token = generateShortToken(owner, role)
    res.json({ success: true, token })
})

app.get('/api/tokens/verify/:token', (req, res) => {
    const t = tokenStore.get(req.params.token)
    if (!t) return res.json({ valid: false, error: 'Token no existe' })
    if (t.used) return res.json({ valid: false, error: 'Token ya fue usado' })
    if (t.expiresAt && Date.now() > t.expiresAt) return res.json({ valid: false, error: 'Token expirado (24h)' })
    res.json({ valid: true, owner: t.owner, role: t.role })
})

// ── Email verification ─────────────────────────────────────────
app.post('/api/auth/send-email-code', async (req, res) => {
    const { email } = req.body
    if (!email || !email.includes('@')) return res.json({ success: false, error: 'Email inválido' })
    const code = String(Math.floor(100000 + Math.random() * 900000))
    pendingEmailCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000 })
    try {
        await sendEmailCode(email, code)
        res.json({ success: true, message: 'Código enviado al correo' })
    } catch (e) {
        res.json({ success: false, error: 'Error enviando email: ' + e.message })
    }
})

app.post('/api/auth/verify-email-code', (req, res) => {
    const { email, code } = req.body
    const entry = pendingEmailCodes.get(email?.toLowerCase())
    if (!entry) return res.json({ success: false, error: 'No hay código pendiente' })
    if (Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    pendingEmailCodes.delete(email.toLowerCase())
    res.json({ success: true })
})

// ── Auth ──────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regToken, email } = req.body
    if (!username || !password || !regToken) return res.json({ success: false, error: 'Faltan datos requeridos (usuario, contraseña, token)' })

    const t = tokenStore.get(regToken)
    if (!t) return res.json({ success: false, error: 'Token inválido' })
    if (t.used) return res.json({ success: false, error: 'Token ya fue usado anteriormente' })
    if (t.expiresAt && Date.now() > t.expiresAt) return res.json({ success: false, error: 'Token expirado (válido 24h)' })
    if (password.length < 6) return res.json({ success: false, error: 'La contraseña debe tener mínimo 6 caracteres' })

    const cleanUser = cleanNum(username) || username.toLowerCase().trim()
    if (!cleanUser) return res.json({ success: false, error: 'Usuario inválido' })
    if (webUsers.has(cleanUser)) return res.json({ success: false, error: 'Usuario ya registrado' })

    webUsers.set(cleanUser, {
        username: cleanUser,
        password: hashPwd(password),
        role: t.role,
        email: email || null,
        emailVerified: false,
        money: 0,
        createdAt: new Date().toISOString(),
        profile: { phone: cleanUser, bio: '', avatar: '' }
    })
    t.used = true
    saveUsers(); saveTokens()

    const sessionToken = genSession()
    activeSessions.set(sessionToken, { username: cleanUser, role: t.role, createdAt: new Date() })
    res.json({ success: true, token: sessionToken, username: cleanUser, role: t.role })
})

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.json({ success: false, error: 'Faltan usuario y contraseña' })

    // Accept phone number OR email
    let cleanUser = cleanNum(username)
    let user = webUsers.get(cleanUser)
    if (!user) {
        // Try email login
        user = [...webUsers.values()].find(u => u.email?.toLowerCase() === username.toLowerCase())
        if (user) cleanUser = user.username
    }

    if (!user || user.password !== hashPwd(password)) return res.json({ success: false, error: 'Credenciales inválidas' })

    const token = genSession()
    activeSessions.set(token, { username: cleanUser, role: user.role, createdAt: new Date() })
    res.json({ success: true, token, username: cleanUser, role: user.role })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ success: true, user: { username: user.username, role: user.role, money: user.money || 0, profile: user.profile || {}, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt } })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
    activeSessions.delete(req.token)
    res.json({ success: true })
})

// ── Profile ───────────────────────────────────────────────────
app.get('/api/profile', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    res.json({ success: true, profile: { ...user, password: undefined, botLinked: !!getSubBotSocket(user.username) } })
})

app.post('/api/profile/update', requireAuth, (req, res) => {
    const { bio, avatar } = req.body
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    if (!user.profile) user.profile = {}
    if (bio !== undefined) user.profile.bio = bio
    if (avatar !== undefined) user.profile.avatar = avatar
    saveUsers()
    res.json({ success: true, profile: user.profile })
})

app.post('/api/profile/add-email', requireAuth, async (req, res) => {
    const { email } = req.body
    if (!email?.includes('@')) return res.json({ success: false, error: 'Email inválido' })
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    const code = String(Math.floor(100000 + Math.random() * 900000))
    pendingEmailCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000, pendingFor: user.username })
    try {
        await sendEmailCode(email, code)
        res.json({ success: true })
    } catch (e) {
        res.json({ success: false, error: e.message })
    }
})

app.post('/api/profile/verify-email', requireAuth, (req, res) => {
    const { email, code } = req.body
    const entry = pendingEmailCodes.get(email?.toLowerCase())
    if (!entry || Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    user.email = email.toLowerCase()
    user.emailVerified = true
    pendingEmailCodes.delete(email.toLowerCase())
    saveUsers()
    res.json({ success: true })
})

// ── Dashboard ─────────────────────────────────────────────────
app.get('/api/dashboard', requireAuth, async (req, res) => {
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.json({ success: true, hasBot: false })

    const { jid, sock, config } = subData
    const isConnected = sock.ws?.readyState === 1
    let groups = []
    if (isConnected) {
        try {
            const all = await sock.groupFetchAllParticipating()
            for (const [gJid, meta] of Object.entries(all)) {
                const me = meta.participants.find(p => p.id === sock.user?.jid)
                groups.push({ jid: gJid, name: meta.subject, participants: meta.participants.length, isAdmin: me?.admin === 'admin' || me?.admin === 'superadmin', desc: meta.desc || '' })
            }
        } catch {}
    }

    res.json({ success: true, hasBot: true, bot: { jid, name: sock.user?.name || config.name || 'Sub-Bot', number: cleanNum(jid), status: isConnected ? 'connected' : 'disconnected', uptime: process.uptime(), config: { mode: config.mode || 'public', antiPrivate: config.antiPrivate || false, antiSpam: config.antiSpam !== false, cooldown: config.cooldown || 3000 }, groups } })
})

app.post('/api/dashboard/config', requireAuth, (req, res) => {
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    const { name, mode, antiPrivate, antiSpam, cooldown } = req.body
    const updates = {}
    if (name) updates.name = name.slice(0, 30)
    if (mode && ['public', 'private'].includes(mode)) updates.mode = mode
    if (typeof antiPrivate === 'boolean') updates.antiPrivate = antiPrivate
    if (typeof antiSpam === 'boolean') updates.antiSpam = antiSpam
    if (cooldown) updates.cooldown = parseInt(cooldown)
    const newConfig = { ...(subData.config || {}), ...updates }
    if (subData.sock.subConfig) subData.sock.subConfig = newConfig
    res.json({ success: true, config: newConfig })
})

// ── Bot management (user) ──────────────────────────────────────
app.post('/api/dashboard/restart', requireAuth, async (req, res) => {
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    try {
        subData.sock.ev?.removeAllListeners()
        if (subData.sock.ws?.readyState === 1) subData.sock.ws.close()
        res.json({ success: true, message: 'Bot reiniciando...' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.delete('/api/dashboard/bot', requireAuth, (req, res) => {
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    try {
        subData.sock.ev?.removeAllListeners()
        if (subData.sock.ws) subData.sock.ws.close()
        const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(subData.jid))
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true })
        global.subBots?.delete(subData.jid)
        global.subBotsData?.delete(subData.jid)
        res.json({ success: true, message: 'Bot eliminado' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.delete('/api/dashboard/session', requireAuth, (req, res) => {
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(subData.jid))
    try {
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true })
        res.json({ success: true, message: 'Sesión eliminada' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ── Logo upload ────────────────────────────────────────────────
app.post('/api/dashboard/logo', requireAuth, async (req, res) => {
    const { zone, imageBase64 } = req.body
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    try {
        const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        const fileName = `logo_${zone}_${Date.now()}.png`
        const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads')
        fs.mkdirSync(uploadsDir, { recursive: true })
        fs.writeFileSync(path.join(uploadsDir, fileName), buffer)
        const url = `/uploads/${fileName}`
        if (!subData.config.logos) subData.config.logos = {}
        subData.config.logos[zone] = url
        if (subData.sock.subConfig) subData.sock.subConfig.logos = subData.config.logos
        res.json({ success: true, url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Get predefined logo options
app.get('/api/dashboard/logo-presets', requireAuth, (req, res) => {
    const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads')
    let files = []
    try {
        files = fs.readdirSync(uploadsDir)
            .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
            .map(f => ({ name: f, url: `/uploads/${f}` }))
    } catch {}
    res.json({ success: true, presets: files })
})

app.delete('/api/dashboard/logo/:zone', requireAuth, (req, res) => {
    const { zone } = req.params
    const subData = getSubBotSocket(req.user.username)
    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })
    if (subData.config.logos) delete subData.config.logos[zone]
    if (subData.sock.subConfig) subData.sock.subConfig.logos = subData.config.logos
    res.json({ success: true })
})

// ── Groups ─────────────────────────────────────────────────────
app.post('/api/dashboard/leave-group', requireAuth, async (req, res) => {
    const { groupJid } = req.body
    const subData = getSubBotSocket(req.user.username)
    if (!subData?.sock) return res.status(404).json({ error: 'Sub-bot no conectado' })
    try { await subData.sock.groupLeave(groupJid); res.json({ success: true }) }
    catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Welcome ────────────────────────────────────────────────────
app.get('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => {
    const configs = loadWelcomeConfigs()
    const cfg = configs[req.params.groupJid] || {}
    res.json({ success: true, config: { activo: cfg.activo !== false, caption: cfg.caption || '👋 ¡Bienvenido @{numero} a *{grupo}*!\nYa somos *{miembros}* miembros.', captionBye: cfg.captionBye || '👋 @{numero} ha salido de *{grupo}*. ¡Hasta pronto!', avatarX: cfg.avatarX || 130, avatarY: cfg.avatarY || 200, avatarRadius: cfg.avatarRadius || 90, borderColor: cfg.borderColor || '#00e5ff', titleText: cfg.titleText || '¡Bienvenido!', titleColor: cfg.titleColor || '#00e5ff', nameColor: cfg.nameColor || '#ffffff', groupColor: cfg.groupColor || '#cccccc', membersColor: cfg.membersColor || '#aaaaaa', backgroundImage: cfg.backgroundImage || '', variables: ['{numero}','{grupo}','{miembros}','{nombre}'] } })
})

app.post('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => {
    const configs = loadWelcomeConfigs()
    configs[req.params.groupJid] = { ...configs[req.params.groupJid], ...req.body, updatedAt: new Date().toISOString() }
    saveWelcomeConfigs(configs)
    res.json({ success: true, config: configs[req.params.groupJid] })
})

// ── AI Chat (user zone) ────────────────────────────────────────
const API_CONFIGS = [
    { name: 'Primary', key: 'sk-q7Y22pUkANXdqJRwnEVqfWQcvrA1UPxemAnChLmMlAEpN6zU1wFztlJKhoclm7IeoK_iDJaf2QFczOg', url: 'https://api.routeway.ai/v1/chat/completions', model: 'llama-3.3-70b-instruct:free' },
    { name: 'Secondary', key: 'sk-yDpbFiicXXqW7QWNPfhHJlg3LvZBuKS0qelLMt5HJQyl72K3CB35eB3kiha5eJKq-qmQc8qoHPGxlV569aeCxfo', url: 'https://api.routeway.ai/v1/chat/completions', model: 'llama-3.3-70b-instruct:free' },
    { name: 'Tertiary', key: 'sk-aYtfRulTFY4ktguZSpp0ic8l7HFsr2U_mXqsRzLgw_ZpGK5RmSlzWe_L8ZWItg', url: 'https://api.routeway.ai/v1/chat/completions', model: 'nemotron-3-nano-30b-a3b:free' }
]

async function callAI(messages, systemPrompt, index = 0) {
    if (index >= API_CONFIGS.length) throw new Error('Todos los servicios AI no disponibles')
    const cfg = API_CONFIGS[index]
    try {
        const body = { model: cfg.model, max_tokens: 2048, messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages }
        const res = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return data.choices?.[0]?.message?.content || 'Sin respuesta'
    } catch (e) {
        console.warn(`AI ${cfg.name} falló:`, e.message)
        return callAI(messages, systemPrompt, index + 1)
    }
}

// Leer comandos del bot
function getBotCommandsSummary() {
    const cmdDir = path.join(process.cwd(), 'src', 'commands')
    let summary = []
    try {
        if (!fs.existsSync(cmdDir)) return ''
        const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))
        files.forEach(f => {
            try {
                const content = fs.readFileSync(path.join(cmdDir, f), 'utf-8')
                const matches = content.match(/command\s*[:=]\s*['"`]([^'"`]+)['"`]/g) || []
                matches.forEach(m => {
                    const cmd = m.match(/['"`]([^'"`]+)['"`]/)?.[1]
                    if (cmd) summary.push(`${global.prefix || '.'}${cmd} (en ${f})`)
                })
            } catch {}
        })
    } catch {}
    return summary.slice(0, 50).join(', ')
}

const BOT_SYSTEM_PROMPT = `Eres el asistente inteligente de Asta Bot, un bot de WhatsApp. 
Tu trabajo es ayudar a los usuarios a entender y usar el bot.
Comandos disponibles: ${getBotCommandsSummary() || 'menu, info, ayuda, ping, grupos, premium, gacha, rpg, descargar, youtube, tiktok, instagram'}
Prefijo del bot: ${global.prefix || '.'}
Responde siempre en español, de forma amigable y concisa.
Si preguntan por un comando, explica cómo usarlo.
Si simulan un chat con el bot, responde como lo haría el bot (con el prefijo).`

// Simular comandos del bot en web
async function simulateBotCommand(text) {
    const prefix = global.prefix || '.'
    if (!text.startsWith(prefix)) return null
    const cmd = text.slice(prefix.length).split(' ')[0].toLowerCase()
    const args = text.slice(prefix.length + cmd.length).trim()

    // Comandos simulados básicos
    const simulated = {
        ping: '🏓 *Pong!* El bot está activo.',
        menu: `╔══════════════════╗\n║ 🤖 *ASTA BOT MENU* ║\n╚══════════════════╝\n\n📱 *Juegos:* ${prefix}rpg, ${prefix}gacha\n🎵 *Descargas:* ${prefix}yt, ${prefix}tt, ${prefix}ig\n👥 *Grupos:* ${prefix}ban, ${prefix}add, ${prefix}kick\n💰 *Economía:* ${prefix}balance, ${prefix}daily`,
        info: `*🤖 Asta Bot v${global.version || '2.0.0'}*\n📊 Bots activos: ${global.subBots?.size || 0}\n⏱️ Uptime: ${Math.floor(process.uptime() / 3600)}h`,
        balance: '💰 Tu balance: $0\n💎 Premium: No',
    }

    return simulated[cmd] || null
}

app.post('/api/chat/message', requireAuth, async (req, res) => {
    const { message, history = [] } = req.body
    if (!message?.trim()) return res.json({ success: false, error: 'Mensaje vacío' })

    // Check if it's a bot command simulation
    const simulated = await simulateBotCommand(message.trim())
    if (simulated) return res.json({ success: true, reply: simulated, isBot: true })

    try {
        const msgs = [...history.slice(-10), { role: 'user', content: message }]
        const reply = await callAI(msgs, BOT_SYSTEM_PROMPT)
        res.json({ success: true, reply, isBot: false })
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
})

// ── Media downloads ────────────────────────────────────────────
app.post('/api/download', requireAuth, async (req, res) => {
    const { url, type } = req.body
    if (!url) return res.json({ success: false, error: 'URL requerida' })

    const apis = global.Api || {}
    try {
        let result = null
        const domain = new URL(url).hostname

        if (domain.includes('youtube') || domain.includes('youtu.be')) {
            if (apis.youtube) result = await apis.youtube(url, type)
        } else if (domain.includes('instagram')) {
            if (apis.instagram) result = await apis.instagram(url, type)
        } else if (domain.includes('tiktok')) {
            if (apis.tiktok) result = await apis.tiktok(url, type)
        } else if (domain.includes('facebook') || domain.includes('fb.com')) {
            if (apis.facebook) result = await apis.facebook(url, type)
        }

        if (!result) return res.json({ success: false, error: 'No se pudo obtener el contenido o la API no está configurada' })
        res.json({ success: true, data: result })
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
})

// ═════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═════════════════════════════════════════════════════════════

app.get('/api/admin/stats', requireAuth, requireRole('owner'), (req, res) => {
    const bots = getAllSubBots()
    res.json({ success: true, stats: { totalBots: bots.length, connectedBots: bots.filter(b => b.status === 'connected').length, totalUsers: webUsers.size, activeSessions: activeSessions.size, uptime: process.uptime(), memory: process.memoryUsage() }, bots, logs: (global.webLogs || []).slice(-100) })
})

app.get('/api/admin/bots', requireAuth, requireRole('owner'), (req, res) => {
    res.json({ success: true, bots: getAllSubBots() })
})

app.post('/api/admin/bot/:jid/restart', requireAuth, requireRole('owner'), async (req, res) => {
    const jid = decodeURIComponent(req.params.jid)
    const sock = global.subBots?.get(jid) || global.subBots?.get(cleanNum(jid))
    try {
        if (sock) { sock.ev?.removeAllListeners(); if (sock.ws?.readyState === 1) sock.ws.close() }
        res.json({ success: true, message: 'Bot reiniciado' })
    } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/admin/bot/:jid', requireAuth, requireRole('owner'), (req, res) => {
    const jid = decodeURIComponent(req.params.jid)
    const num = cleanNum(jid)
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', num)
    try {
        const sock = global.subBots?.get(jid) || global.subBots?.get(num)
        if (sock) { sock.ev?.removeAllListeners(); if (sock.ws) sock.ws.close() }
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true })
        global.subBots?.delete(jid); global.subBots?.delete(num)
        global.subBotsData?.delete(jid); global.subBotsData?.delete(num)
        res.json({ success: true })
    } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/admin/bot/:jid/session', requireAuth, requireRole('owner'), (req, res) => {
    const jid = decodeURIComponent(req.params.jid)
    const num = cleanNum(jid)
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', num)
    try {
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true })
        res.json({ success: true, message: 'Sesión eliminada' })
    } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/admin/users', requireAuth, requireRole('owner'), (req, res) => {
    const users = [...webUsers.values()].map(u => ({ username: u.username, role: u.role, money: u.money || 0, email: u.email, emailVerified: u.emailVerified, createdAt: u.createdAt, profile: u.profile || {} }))
    res.json({ success: true, users })
})

app.post('/api/admin/users', requireAuth, requireRole('owner'), (req, res) => {
    const { username, password, role = 'user' } = req.body
    if (!username || !password) return res.json({ success: false, error: 'Faltan usuario y contraseña' })
    if (password.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })
    const cleanUser = cleanNum(username) || username.toLowerCase().trim()
    if (webUsers.has(cleanUser)) return res.json({ success: false, error: 'Usuario ya existe' })
    webUsers.set(cleanUser, { username: cleanUser, password: hashPwd(password), role, money: 0, createdBy: req.user.username, createdAt: new Date().toISOString(), profile: { phone: cleanUser, bio: '', avatar: '' } })
    saveUsers()
    res.json({ success: true, message: 'Usuario creado exitosamente' })
})

app.delete('/api/admin/users/:username', requireAuth, requireRole('owner'), (req, res) => {
    const u = cleanNum(req.params.username) || req.params.username
    if (!webUsers.has(u)) return res.status(404).json({ error: 'Usuario no encontrado' })
    webUsers.delete(u); saveUsers()
    res.json({ success: true })
})

app.post('/api/admin/users/:username/money', requireAuth, requireRole('owner'), (req, res) => {
    const u = cleanNum(req.params.username) || req.params.username
    const user = webUsers.get(u)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    const { action, amount } = req.body
    const prev = user.money || 0
    if (action === 'add') user.money = prev + parseInt(amount)
    else if (action === 'remove') user.money = Math.max(0, prev - parseInt(amount))
    else if (action === 'set') user.money = parseInt(amount)
    saveUsers()
    res.json({ success: true, user: { username: user.username, money: user.money, previousMoney: prev } })
})

// Generate token from admin panel
app.post('/api/admin/tokens/generate', requireAuth, requireRole('owner'), (req, res) => {
    const { role = 'user' } = req.body
    const token = generateShortToken(req.user.username, role)
    res.json({ success: true, token, expiresIn: '24 horas' })
})

// ── Admin AI (document editing / command creation) ─────────────
const ADMIN_AI_SYSTEM = `Eres un asistente de desarrollo para Asta Bot.
Tienes acceso conceptual a todos los documentos del bot.
Puedes:
1. Crear nuevos comandos en formato de plugin de Asta Bot
2. Analizar y sugerir mejoras a comandos existentes
3. Leer y explicar documentos del bot
4. Dar recomendaciones de arquitectura
5. Ayudar a solucionar bugs

Formato de comando de Asta Bot:
\`\`\`js
const handler = async (m, { conn, args, usedPrefix, command }) => {
  // lógica aquí
  await conn.sendMessage(m.chat, { text: 'respuesta' }, { quoted: m })
}
handler.command = ['nombre']
handler.help = ['nombre <args>']
handler.tags = ['categoria']
handler.owner = false
handler.group = false
export default handler
\`\`\`

Responde siempre en español. Cuando crees comandos, dales formato completo listo para usar.`

// Leer documentos del bot para la IA de admin
function getBotDocuments() {
    const dirs = ['src/commands', 'lib', 'src/database']
    let docs = {}
    dirs.forEach(dir => {
        const fullDir = path.join(process.cwd(), dir)
        try {
            if (!fs.existsSync(fullDir)) return
            fs.readdirSync(fullDir).filter(f => f.endsWith('.js')).slice(0, 20).forEach(f => {
                try {
                    const content = fs.readFileSync(path.join(fullDir, f), 'utf-8')
                    docs[`${dir}/${f}`] = content.slice(0, 3000) // Limit size
                } catch {}
            })
        } catch {}
    })
    return docs
}

app.post('/api/admin/ai/chat', requireAuth, requireRole('owner'), async (req, res) => {
    const { message, history = [], includeDocuments = false } = req.body
    if (!message?.trim()) return res.json({ success: false, error: 'Mensaje vacío' })

    let systemPrompt = ADMIN_AI_SYSTEM
    if (includeDocuments) {
        const docs = getBotDocuments()
        const docSummary = Object.entries(docs).map(([k, v]) => `### ${k}\n${v.slice(0, 500)}`).join('\n\n')
        systemPrompt += `\n\nDocumentos del bot disponibles:\n${docSummary}`
    }

    try {
        const msgs = [...history.slice(-15), { role: 'user', content: message }]
        const reply = await callAI(msgs, systemPrompt)
        res.json({ success: true, reply })
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
})

app.post('/api/admin/ai/analyze', requireAuth, requireRole('owner'), async (req, res) => {
    try {
        const docs = getBotDocuments()
        const docList = Object.keys(docs).join(', ')
        const prompt = `Analiza la arquitectura de Asta Bot. Archivos disponibles: ${docList}. 
Proporciona:
1. Resumen de la arquitectura
2. Puntos fuertes detectados
3. Áreas de mejora
4. Recomendaciones de optimización
5. Posibles bugs o problemas`

        const reply = await callAI([{ role: 'user', content: prompt }], ADMIN_AI_SYSTEM)
        res.json({ success: true, analysis: reply })
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
})

app.get('/api/admin/documents', requireAuth, requireRole('owner'), (req, res) => {
    const docs = getBotDocuments()
    res.json({ success: true, documents: Object.keys(docs).map(k => ({ path: k, size: docs[k].length })) })
})

app.get('/api/admin/documents/:file(*)', requireAuth, requireRole('owner'), (req, res) => {
    const filePath = path.join(process.cwd(), req.params.file)
    // Security: only allow reading from project directory
    if (!filePath.startsWith(process.cwd())) return res.status(403).json({ error: 'Acceso denegado' })
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        res.json({ success: true, content })
    } catch (e) {
        res.status(404).json({ error: 'Archivo no encontrado' })
    }
})

// ── Socket.io ──────────────────────────────────────────────────
io.on('connection', socket => {
    socket.emit('info', { name: global.namebot || 'Asta Bot', logo: global.logo, icono: global.icono })
    socket.on('subscribe-logs', token => {
        const s = activeSessions.get(token)
        if (s?.role === 'owner') { socket.join('admin-logs'); socket.emit('logs-subscribed', true) }
    })
    socket.on('disconnect', () => {})
})

global.emitLog = (type, message, data = {}) => {
    io.to('admin-logs').emit('log', { type, message, data, time: new Date().toISOString() })
}

// ── Page routes ────────────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'src', 'public')
app.get('/',          (_, res) => res.sendFile(path.join(publicDir, 'index.html')))
app.get('/login',     (_, res) => res.sendFile(path.join(publicDir, 'login.html')))
app.get('/dashboard', (_, res) => res.sendFile(path.join(publicDir, 'dashboard.html')))
app.get('/admin',     (_, res) => res.sendFile(path.join(publicDir, 'admin.html')))

httpServer.listen(PORT, HOST, () => {
    console.log(`\n🌐 Asta Web v2 iniciado → http://localhost:${PORT}`)
})

export { app, io }
