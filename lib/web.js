// lib/web.js
import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 24683

const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'], credentials: true } })

const activeSessions = new Map()
const pendingEmailCodes = new Map()
const tokenStore = new Map()

// DIRECTORIOS UNIFICADOS
const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const WELCOME_FILE = path.join(DATA_DIR, 'welcome-configs.json')
const UPLOADS_DIR = path.join(process.cwd(), 'src', 'public', 'uploads')

    ;[DATA_DIR, UPLOADS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }))

// ========== FUNCIONES BASE ==========
const cleanNum = n => { if (!n) return ''; return String(n).replace(/[^0-9]/g, '') }
const hashPwd = p => crypto.createHash('sha256').update(p + 'asta-salt-2024').digest('hex')
const genTk = () => crypto.randomBytes(32).toString('hex')

// ========== SISTEMA UNIFICADO DE USUARIOS ==========
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            const defaultUsers = []
            if (global.owner && Array.isArray(global.owner)) {
                global.owner.forEach(owner => {
                    const phone = Array.isArray(owner) ? owner[0] : owner
                    const name = Array.isArray(owner) ? owner[1] : 'Owner'
                    defaultUsers.push({
                        username: phone,
                        password: hashPwd(phone),
                        role: 'owner',
                        email: null,
                        emailVerified: false,
                        money: 999999,
                        bank: 0,
                        exp: 0,
                        level: 99,
                        lastClaim: Date.now(),
                        createdAt: new Date().toISOString(),
                        profile: { displayName: name, bio: 'Owner del sistema', avatar: '', phone: phone }
                    })
                })
            }
            fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2))
            return defaultUsers
        }
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    } catch (e) { console.error('loadUsers:', e); return [] }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    } catch (e) { console.error('saveUsers:', e) }
}

function ensureUser(username, role = 'user') {
    let users = loadUsers()
    let user = users.find(u => u.username === username)
    if (!user) {
        user = {
            username: username,
            password: hashPwd('default'),
            role: role,
            email: null,
            emailVerified: false,
            money: 0,
            bank: 0,
            exp: 0,
            level: 1,
            lastClaim: null,
            createdAt: new Date().toISOString(),
            profile: { displayName: '', bio: '', avatar: '', phone: username }
        }
        users.push(user)
        saveUsers(users)
    }
    return user
}

function updateUserEconomy(username, updates) {
    let users = loadUsers()
    const index = users.findIndex(u => u.username === username)
    if (index === -1) return null
    users[index] = { ...users[index], ...updates }
    saveUsers(users)
    return users[index]
}

// ========== TOKENS CON VINCULACIÓN DE NÚMERO ==========
function generateShortToken(ownerNumber, role = 'user') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]
    const tk = `ASTA-${s}`
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    const uid = cleanNum(ownerNumber) || ownerNumber

    tokenStore.set(tk, {
        token: tk,
        ownerNumber: uid,
        role,
        used: false,
        createdAt: Date.now(),
        expiresAt
    })

    setTimeout(() => {
        const t = tokenStore.get(tk);
        if (t && !t.used) tokenStore.delete(tk)
    }, 24 * 60 * 60 * 1000)

    return tk
}

// ========== CORREO (BREVO) ==========
function makeEmailHtml(title, body, code = null) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:'Segoe UI',sans-serif;background:#080C14;margin:0;padding:20px"><div style="max-width:460px;margin:auto;background:#0F172A;border-radius:20px;overflow:hidden;border:1px solid #1E293B"><div style="padding:24px 32px;background:linear-gradient(135deg,#00D9FF22,#0F172A)"><h2 style="margin:0;color:#00D9FF">${global.namebot || 'Asta Bot'}</h2></div><div style="padding:24px 32px;color:#F1F5F9"><h3 style="margin:0 0 10px;color:#00D9FF">${title}</h3><p style="color:#94A3B8;margin:0 0 18px">${body}</p>${code ? `<div style="font-size:2rem;font-weight:700;letter-spacing:10px;color:#00D9FF;text-align:center;padding:16px;background:#0B0F19;border-radius:12px;border:1px solid #00D9FF33">${code}</div>` : ''}<p style="color:#475569;font-size:.78rem;margin:18px 0 0">Mensaje automático – no respondas.</p></div></div></body></html>`
}

async function sendEmail(to, subject, html) {
    const apiKey = global.BREVO_API_KEY
    const senderEmail = global.BREVO_EMAIL
    if (!apiKey) return console.error('❌ Brevo API Key faltante')
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
            body: JSON.stringify({
                sender: { email: senderEmail, name: global.namebot || 'Asta Bot' },
                to: [{ email: to }],
                subject: subject,
                htmlContent: html
            })
        })
        if (!response.ok) { const error = await response.json(); throw new Error(error.message) }
        console.log(`📧 Email enviado a ${to}`)
        return true
    } catch (error) { console.error('Error enviando email:', error); throw error }
}

// ========== HELPERS DE SUB-BOTS ==========
function getSubBotByOwner(username) {
    const num = cleanNum(username) || username
    if (!global.subBots) return null
    for (const [jid, sock] of global.subBots) {
        if (!sock?.user) continue
        const cfg = sock.subConfig || {}
        if (cleanNum(cfg.owner) === num || cleanNum(jid) === num) return { jid, sock, config: cfg }
    }
    return null
}

function getAllSubBots() {
    const seen = new Set(); const bots = []
    if (!global.subBots) return bots
    for (const [jid, sock] of global.subBots) {
        if (!sock?.user) continue
        const n = cleanNum(jid)
        if (seen.has(n)) continue
        seen.add(n)
        const cfg = sock.subConfig || {}
        bots.push({ jid, name: sock.user?.name || cfg.name || 'Sub-Bot', number: n, status: sock.user ? 'connected' : 'disconnected', owner: cfg.owner || 'Unknown', config: cfg })
    }
    return bots
}

// ========== MIDDLEWARES ==========
const requireAuth = (req, res, next) => {
    const tk = req.headers.authorization?.replace('Bearer ', '') || req.query.token
    if (!tk || !activeSessions.has(tk)) return res.status(401).json({ error: 'No autorizado' })
    req.user = activeSessions.get(tk)
    req.token = tk
    next()
}
const requireOwner = (req, res, next) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' })
    next()
}

app.use(cors({ origin: '*', credentials: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'src', 'public')))

// ========== RUTAS API ==========

app.get('/api/info', (req, res) => {
    const owners = (global.owner || []).map(o => ({ number: Array.isArray(o) ? o[0] : o, name: Array.isArray(o) ? o[1] : 'Owner' }))
    res.json({
        success: true, name: global.namebot || 'Asta Bot', logo: global.logo || '', icono: global.icono || '',
        description: global.description || 'Bot WhatsApp 24/7', owners, prefix: global.prefix || '.',
        stats: { totalUsers: loadUsers().length, uptime: process.uptime(), version: global.vs || '2.0.0' }
    })
})

// ========== TOKENS ==========
app.post('/api/tokens/create', (req, res) => {
    const { secret, owner, role = 'user' } = req.body
    if (secret !== global.webSecret && secret !== 'asta-web-2024') return res.status(403).json({ error: 'Secret inválido' })
    const tk = generateShortToken(owner, role)
    res.json({ success: true, token: tk, owner: cleanNum(owner) || owner })
})

app.get('/api/tokens/verify/:token', (req, res) => {
    const t = tokenStore.get(req.params.token?.toUpperCase())
    if (!t) return res.json({ valid: false, error: 'Token no existe' })
    if (t.used) return res.json({ valid: false, error: 'Token ya fue usado' })
    if (Date.now() > t.expiresAt) return res.json({ valid: false, error: 'Token expirado (válido 24h)' })
    res.json({ valid: true, owner: t.ownerNumber, role: t.role, linkedNumber: t.ownerNumber })
})

// ========== AUTH ==========
app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regTk } = req.body
    if (!username || !password || !regTk) return res.json({ success: false, error: 'Faltan datos' })
    const tk = tokenStore.get(regTk?.toUpperCase())
    if (!tk || tk.used || Date.now() > tk.expiresAt) return res.json({ success: false, error: 'Token inválido o expirado' })
    if (password.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })

    const uid = cleanNum(username) || username.toLowerCase().trim()
    if (tk.ownerNumber !== uid) return res.json({ success: false, error: `Este token pertenece al número +${tk.ownerNumber}. Debes registrarte con ese número.` })

    let users = loadUsers()
    if (users.find(u => u.username === uid)) return res.json({ success: false, error: 'Usuario ya registrado' })

    const newUser = {
        username: uid, password: hashPwd(password), role: tk.role,
        email: null, emailVerified: false, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null,
        createdAt: new Date().toISOString(),
        profile: { displayName: '', bio: '', avatar: '', phone: uid }
    }
    users.push(newUser)
    saveUsers(users)
    tk.used = true

    const session = genTk()
    activeSessions.set(session, { username: uid, role: tk.role, createdAt: new Date() })
    res.json({ success: true, token: session, username: uid, role: tk.role })
})

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.json({ success: false, error: 'Completa todos los campos' })
    let uid = cleanNum(username) || username.toLowerCase().trim()
    let users = loadUsers()
    let user = users.find(u => u.username === uid)
    if (!user) user = users.find(u => u.email?.toLowerCase() === username.toLowerCase())
    if (!user) return res.json({ success: false, error: 'Credenciales incorrectas' })
    if (user.password !== hashPwd(password)) return res.json({ success: false, error: 'Credenciales incorrectas' })

    const session = genTk()
    activeSessions.set(session, { username: user.username, role: user.role, createdAt: new Date() })
    res.json({ success: true, token: session, username: user.username, role: user.role })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
    const users = loadUsers()
    const user = users.find(u => u.username === req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    res.json({ success: true, user })
})

// ========== PERFIL Y ECONOMÍA ==========
app.get('/api/profile', requireAuth, (req, res) => {
    const users = loadUsers()
    const user = users.find(u => u.username === req.user.username)
    res.json({ success: true, profile: user })
})

app.post('/api/profile/update', requireAuth, (req, res) => {
    const { bio, avatar, displayName } = req.body
    let users = loadUsers()
    const idx = users.findIndex(u => u.username === req.user.username)
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' })
    if (bio !== undefined) users[idx].profile.bio = bio
    if (avatar !== undefined) users[idx].profile.avatar = avatar
    if (displayName !== undefined) users[idx].profile.displayName = String(displayName).slice(0, 40)
    saveUsers(users)
    res.json({ success: true, profile: users[idx] })
})

app.post('/api/profile/email/send-code', requireAuth, async (req, res) => {
    const { email } = req.body
    if (!email?.includes('@')) return res.json({ success: false, error: 'Email inválido' })
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    pendingEmailCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000, pendingFor: req.user.username })
    try {
        await sendEmail(email, '📧 Verificar correo', makeEmailHtml('Verificar tu correo', 'Usa este código para verificar tu cuenta:', code))
        res.json({ success: true })
    } catch (e) { res.json({ success: false, error: e.message }) }
})

app.post('/api/profile/email/verify', requireAuth, (req, res) => {
    const { email, code } = req.body
    const entry = pendingEmailCodes.get(email?.toLowerCase())
    if (!entry || Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    let users = loadUsers()
    const idx = users.findIndex(u => u.username === req.user.username)
    if (idx !== -1) { users[idx].email = email.toLowerCase(); users[idx].emailVerified = true; saveUsers(users) }
    pendingEmailCodes.delete(email.toLowerCase())
    res.json({ success: true })
})

app.delete('/api/profile/email', requireAuth, (req, res) => {
    let users = loadUsers()
    const idx = users.findIndex(u => u.username === req.user.username)
    if (idx !== -1) { users[idx].email = null; users[idx].emailVerified = false; saveUsers(users) }
    res.json({ success: true })
})

// ========== DASHBOARD ==========
app.get('/api/dashboard', requireAuth, async (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.json({ success: true, hasBot: false })
    const { jid, sock, config: cfg } = sub
    const connected = !!sock.user
    let groups = []
    if (connected) {
        try {
            const all = await sock.groupFetchAllParticipating()
            for (const [gJid, meta] of Object.entries(all)) {
                const me = meta.participants.find(p => p.id === sock.user?.jid)
                groups.push({ jid: gJid, name: meta.subject, participants: meta.participants.length, isAdmin: me?.admin === 'admin' || me?.admin === 'superadmin', desc: meta.desc || '' })
            }
        } catch (e) { }
    }
    const users = loadUsers()
    const userData = users.find(u => u.username === req.user.username)
    res.json({
        success: true, hasBot: true,
        bot: {
            jid, name: sock.user?.name || cfg.name || 'Sub-Bot', number: cleanNum(jid),
            status: connected ? 'connected' : 'disconnected', uptime: process.uptime(),
            config: { mode: cfg.mode || 'public', antiPrivate: cfg.antiPrivate || false, antiSpam: cfg.antiSpam !== false, cooldown: cfg.cooldown || 3000 },
            groups, money: userData?.money || 0, bank: userData?.bank || 0
        }
    })
})

app.post('/api/dashboard/config', requireAuth, async (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.status(404).json({ error: 'Bot no encontrado' })
    const { name, mode, antiPrivate, antiSpam, cooldown } = req.body
    const updates = {}
    if (name) updates.name = String(name).slice(0, 30)
    if (mode && ['public', 'private'].includes(mode)) updates.mode = mode
    if (typeof antiPrivate === 'boolean') updates.antiPrivate = antiPrivate
    if (typeof antiSpam === 'boolean') updates.antiSpam = antiSpam
    if (cooldown) updates.cooldown = parseInt(cooldown)
    try {
        const { saveSubConfig } = await import('./serbot.js')
        saveSubConfig(cleanNum(sub.jid), updates)
        if (sub.sock.subConfig) Object.assign(sub.sock.subConfig, updates)
    } catch (e) { }
    res.json({ success: true })
})

app.post('/api/dashboard/restart', requireAuth, (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.status(404).json({ error: 'Bot no encontrado' })
    try { sub.sock.ev?.removeAllListeners(); if (sub.sock.ws?.readyState === 1) sub.sock.ws.close() } catch (e) { }
    res.json({ success: true })
})

app.delete('/api/dashboard/bot', requireAuth, (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.status(404).json({ error: 'Bot no encontrado' })
    try {
        sub.sock.ev?.removeAllListeners();
        if (sub.sock.ws) sub.sock.ws.close();
        const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(sub.jid));
        if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true });
        global.subBots?.delete(sub.jid);
        global.subBotsData?.delete(sub.jid)
    } catch (e) { return res.status(500).json({ error: e.message }) }
    res.json({ success: true })
})

app.delete('/api/dashboard/session', requireAuth, (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.status(404).json({ error: 'Bot no encontrado' })
    const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(sub.jid));
    try { if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }) } catch (e) { return res.status(500).json({ error: e.message }) }
    res.json({ success: true })
})

// ========== VINCULAR BOT ==========
app.post('/api/bot/connect/qr', async (req, res) => {
    try {
        const { startWebConnection, cancelWebConnection, generateQRBuffer } = await import('./serbot.js')
        const tempId = `webqr_${Date.now()}`
        await startWebConnection(tempId, 'qr', { onQR: () => { }, onConnected: () => { }, onError: () => { }, onTimeout: () => { } })
        let buf = null, attempts = 0
        while (attempts++ < 25) { buf = await generateQRBuffer?.(tempId); if (buf) break; await new Promise(r => setTimeout(r, 1000)) }
        if (!buf) { cancelWebConnection?.(tempId); return res.json({ success: false, error: 'No se pudo generar el QR' }) }
        const fname = `qr_${tempId}.png`
        fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf)
        setTimeout(() => { try { fs.unlinkSync(path.join(UPLOADS_DIR, fname)) } catch (e) { } }, 50000)
        res.json({ success: true, qrUrl: `/uploads/${fname}`, tempId, expiresIn: 45 })
    } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/bot/connect/code', async (req, res) => {
    const { phoneNumber } = req.body
    const uid = cleanNum(phoneNumber)
    if (!uid) return res.json({ success: false, error: 'Número inválido' })
    try {
        const { startWebConnection, getPairingCode } = await import('./serbot.js')
        global.webPendingConnections?.delete(uid)
        await new Promise(r => setTimeout(r, 1500))
        await startWebConnection(uid, 'code', { onCode: () => { }, onConnected: () => { }, onError: () => { }, onTimeout: () => { } })
        let codeInfo = null, attempts = 0
        while (attempts++ < 40) { codeInfo = getPairingCode?.(uid); if (codeInfo) break; await new Promise(r => setTimeout(r, 1000)) }
        if (!codeInfo) return res.json({ success: false, error: 'Tiempo agotado' })
        res.json({ success: true, code: codeInfo.formatted, rawCode: codeInfo.raw, phoneNumber: uid, expiresIn: Math.floor((codeInfo.expiresAt - Date.now()) / 1000), instructions: 'WhatsApp → ⋮ → Dispositivos vinculados → Vincular con código' })
    } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/bot/link', requireAuth, async (req, res) => {
    const { phoneNumber } = req.body
    const uid = cleanNum(phoneNumber || req.user.username)
    try {
        const { linkWebSubBotToUser } = await import('./serbot.js')
        const cfg = linkWebSubBotToUser?.(uid, req.user.username)
        res.json({ success: true, config: cfg })
    } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.get('/api/bot/status/:tempId', (req, res) => {
    const tempId = req.params.tempId

    // First check pending connections (while connecting)
    const ctrl = global.webPendingConnections?.get(tempId)
    if (ctrl) {
        return res.json({
            connected: ctrl.isConnected,
            status: ctrl.status,
            name: ctrl.socket?.user?.name || null,
            number: ctrl.phoneNumber || null
        })
    }

    // If not in pending, check if already connected in subBotsData
    // This handles the case where serbot.js deleted the pending connection
    const cleanId = cleanNum(tempId)

    // Check by tempId directly (for QR connections where tempId = phone number)
    if (global.subBotsData?.has(tempId)) {
        const data = global.subBotsData.get(tempId)
        if (data.state === 'connected') {
            return res.json({
                connected: true,
                status: 'connected',
                name: data.name || null,
                number: data.userId || tempId
            })
        }
    }

    // Check by cleaned number
    if (cleanId && global.subBotsData?.has(cleanId)) {
        const data = global.subBotsData.get(cleanId)
        if (data.state === 'connected') {
            return res.json({
                connected: true,
                status: 'connected',
                name: data.name || null,
                number: data.userId || cleanId
            })
        }
    }

    // Check in subBots Map directly
    if (global.subBots?.has(tempId)) {
        const sock = global.subBots.get(tempId)
        if (sock?.user) {
            return res.json({
                connected: true,
                status: 'connected',
                name: sock.user.name || null,
                number: cleanNum(sock.user.jid || tempId)
            })
        }
    }

    if (cleanId && global.subBots?.has(cleanId)) {
        const sock = global.subBots.get(cleanId)
        if (sock?.user) {
            return res.json({
                connected: true,
                status: 'connected',
                name: sock.user.name || null,
                number: cleanNum(sock.user.jid || cleanId)
            })
        }
    }

    // Check by JID pattern
    if (global.subBots?.has(`${cleanId}@s.whatsapp.net`)) {
        const sock = global.subBots.get(`${cleanId}@s.whatsapp.net`)
        if (sock?.user) {
            return res.json({
                connected: true,
                status: 'connected',
                name: sock.user.name || null,
                number: cleanId
            })
        }
    }

    return res.json({ connected: false })
})

// ========== ADMIN ==========
app.get('/api/admin/users', requireAuth, requireOwner, (req, res) => {
    const users = loadUsers()
    res.json({ success: true, users: users.map(u => ({ username: u.username, role: u.role, money: u.money, email: u.email, emailVerified: u.emailVerified, createdAt: u.createdAt })) })
})

app.post('/api/admin/users', requireAuth, requireOwner, (req, res) => {
    const { username, password, role = 'user' } = req.body
    if (!username || !password) return res.json({ success: false, error: 'Faltan datos' })
    if (password.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })
    const uid = cleanNum(username) || username.toLowerCase().trim()
    let users = loadUsers()
    if (users.find(u => u.username === uid)) return res.json({ success: false, error: 'Ya existe' })
    users.push({
        username: uid, password: hashPwd(password), role, email: null, emailVerified: false,
        money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, createdAt: new Date().toISOString(),
        profile: { displayName: '', bio: '', avatar: '', phone: uid }
    })
    saveUsers(users)
    res.json({ success: true })
})

app.post('/api/admin/users/:u/money', requireAuth, requireOwner, (req, res) => {
    const uid = cleanNum(req.params.u) || req.params.u
    let users = loadUsers()
    const idx = users.findIndex(u => u.username === uid)
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' })
    const { action, amount } = req.body
    if (action === 'add') users[idx].money += parseInt(amount)
    else if (action === 'remove') users[idx].money = Math.max(0, users[idx].money - parseInt(amount))
    else if (action === 'set') users[idx].money = parseInt(amount)
    saveUsers(users)
    res.json({ success: true, user: users[idx] })
})

app.delete('/api/admin/users/:u', requireAuth, requireOwner, (req, res) => {
    const uid = cleanNum(req.params.u) || req.params.u
    let users = loadUsers()
    const newUsers = users.filter(u => u.username !== uid)
    if (newUsers.length === users.length) return res.status(404).json({ error: 'No encontrado' })
    saveUsers(newUsers)
    res.json({ success: true })
})

app.post('/api/admin/tokens/generate', requireAuth, requireOwner, (req, res) => {
    const { role = 'user' } = req.body
    res.json({ success: true, token: generateShortToken(req.user.username, role) })
})

// ========== WEBSOCKET LOGS ==========
io.on('connection', socket => {
    socket.on('subscribe-logs', tk => {
        const s = activeSessions.get(tk)
        if (s?.role === 'owner') socket.join('admin-logs')
    })
})
global.emitLog = (type, message) => io.to('admin-logs').emit('log', { type, message, time: new Date().toISOString() })

// ========== SERVIR HTML ==========
const PUB = path.join(__dirname, '..', 'src', 'public')
app.get('/', (_, res) => res.sendFile(path.join(PUB, 'index.html')))
app.get('/login', (_, res) => res.sendFile(path.join(PUB, 'login.html')))
app.get('/dashboard', (_, res) => res.sendFile(path.join(PUB, 'dashboard.html')))
app.get('/admin', (_, res) => res.sendFile(path.join(PUB, 'admin.html')))
app.get('/vincular', (_, res) => res.sendFile(path.join(PUB, 'vincular.html')))

httpServer.listen(PORT, '0.0.0.0', () => console.log(`\n🌐 Web: http://localhost:${PORT}`))

// ========== EXPORTACIONES (SOLO UNA VEZ CADA UNA - SIN PALABRA EXPORT EN LAS FUNCIONES) ==========
export {
    cleanNum,
    hashPwd,
    genTk,
    loadUsers,
    saveUsers,
    ensureUser,
    updateUserEconomy,
    getSubBotByOwner,
    getAllSubBots,
    generateShortToken,
    app,
    io
}