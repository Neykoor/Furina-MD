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

const getBrevoKey = () => global.BREVO_API_KEY || process.env.BREVO_API_KEY || ''
const getBrevoEmail = () => global.BREVO_EMAIL || process.env.BREVO_EMAIL || ''

const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'], credentials: true } })

const activeSessions = new Map()
const pendingEmailCodes = new Map()
const pendingWACodes = new Map()
const tokenStore = new Map()

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'webusers.json')
const TOKENS_FILE = path.join(DATA_DIR, 'webtokens.json')
const WELCOME_FILE = path.join(DATA_DIR, 'welcome-configs.json')
const UPLOADS_DIR = path.join(process.cwd(), 'src', 'public', 'uploads')
const ECONOMY_FILE = path.join(DATA_DIR, 'economy.json')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')
;[DATA_DIR, UPLOADS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }))

const webUsers = new Map()
const economyData = new Map()
const profilesData = new Map()

function loadJ(f, fb = []) { try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8')) } catch (e) {} return fb }
function saveJ(f, d) { try { fs.writeFileSync(f, JSON.stringify(d, null, 2)) } catch (e) { console.error('saveJ:', e.message) } }

function loadAllData() {
    loadJ(USERS_FILE, []).forEach(u => webUsers.set(u.username, u))
    loadJ(TOKENS_FILE, []).forEach(t => tokenStore.set(t.token, t))
    loadJ(ECONOMY_FILE, []).forEach(e => economyData.set(e.username, e))
    loadJ(PROFILES_FILE, []).forEach(p => profilesData.set(p.username, p))
}
loadAllData()

const saveUsers = () => saveJ(USERS_FILE, [...webUsers.values()])
const saveTokens = () => saveJ(TOKENS_FILE, [...tokenStore.values()])
const saveEconomy = () => saveJ(ECONOMY_FILE, [...economyData.values()])
const saveProfiles = () => saveJ(PROFILES_FILE, [...profilesData.values()])
const loadWelcome = () => loadJ(WELCOME_FILE, {})
const saveWelcome = (cfg) => saveJ(WELCOME_FILE, cfg)

const hashPwd = p => crypto.createHash('sha256').update(p + 'asta-salt-2024').digest('hex')
const genTk = () => crypto.randomBytes(32).toString('hex')
const cleanNum = n => { if (!n) return ''; return String(n).replace(/[^0-9]/g, '') }
const rand6 = () => String(Math.floor(100000 + Math.random() * 900000))
const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function ensureUser(username, role = 'user') {
    const uid = cleanNum(username) || username.toLowerCase().trim()
    if (!uid) return null
    if (!webUsers.has(uid)) {
        const defaultPass = hashPwd(uid + 'auto')
        webUsers.set(uid, { username: uid, password: defaultPass, role, email: null, emailVerified: false, money: 0, createdAt: new Date().toISOString(), profile: { displayName: '', bio: '', avatar: '', phone: uid } })
        if (!economyData.has(uid)) economyData.set(uid, { username: uid, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] })
        if (!profilesData.has(uid)) profilesData.set(uid, { username: uid, displayName: '', bio: '', avatar: '', phone: uid })
        saveUsers(); saveEconomy(); saveProfiles()
        return webUsers.get(uid)
    }
    if (!economyData.has(uid)) { economyData.set(uid, { username: uid, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }); saveEconomy() }
    if (!profilesData.has(uid)) { profilesData.set(uid, { username: uid, displayName: '', bio: '', avatar: '', phone: uid }); saveProfiles() }
    return webUsers.get(uid)
}

function getEconomyForUser(username) {
    const uid = cleanNum(username) || username
    let data = economyData.get(uid)
    if (!data) {
        ensureUser(uid)
        data = economyData.get(uid) || { username: uid, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }
    }
    return data
}

function generateShortToken(owner, role = 'user') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let s = ''
    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]
    const tk = `ASTA-${s}`
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    const uid = cleanNum(owner) || owner
    tokenStore.set(tk, { token: tk, owner: uid, role, used: false, createdAt: Date.now(), expiresAt })
    saveTokens()
    setTimeout(() => { const t = tokenStore.get(tk); if (t && !t.used) tokenStore.delete(tk); saveTokens() }, 24 * 60 * 60 * 1000)
    return tk
}

setInterval(() => { const now = Date.now(); for (const [k, t] of tokenStore) if (t.expiresAt && now > t.expiresAt && !t.used) tokenStore.delete(k); saveTokens() }, 60 * 60 * 1000)

function makeEmailHtml(title, body, code = null) {
    return `<div style="font-family:'Segoe UI',sans-serif;max-width:460px;margin:auto;background:#080C14;border-radius:16px;overflow:hidden"><div style="padding:24px 32px;background:linear-gradient(135deg,#00D9FF22,#080C14)"><h2 style="margin:0;color:#00D9FF">${global.namebot || 'Asta Bot'}</h2></div><div style="padding:24px 32px;color:#EEF2FF"><h3 style="margin:0 0 10px">${title}</h3><p style="color:#8896B0;margin:0 0 18px">${body}</p>${code ? `<div style="font-size:2rem;font-weight:700;letter-spacing:10px;color:#00D9FF;text-align:center;padding:16px;background:#0D1321;border-radius:12px;border:1px solid #00D9FF33">${code}</div>` : ''}<p style="color:#4A5568;font-size:.78rem;margin:18px 0 0">Mensaje automático – no respondas.</p></div></div>`
}

async function sendEmail(to, subject, html) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': getBrevoKey() }, body: JSON.stringify({ sender: { email: getBrevoEmail(), name: global.namebot || 'Asta Bot' }, to: [{ email: to }], subject: subject, htmlContent: html }) })
        if (!response.ok) { const error = await response.json(); throw new Error(error.message || 'Error al enviar email') }
        console.log(`📧 Email enviado a ${to}`)
    } catch (error) { console.error('Error enviando email:', error); throw error }
}

function getSubBotByOwner(username) {
    const num = cleanNum(username) || username
    if (!global.subBots) return null
    const seen = new Set()
    for (const [jid, sock] of global.subBots) { if (!sock?.user) continue; const n = cleanNum(jid); if (seen.has(n)) continue; seen.add(n); const cfg = sock.subConfig || {}; if (cleanNum(cfg.owner) === num || n === num) return { jid, sock, config: cfg } }
    return null
}

function getAllSubBots() {
    const seen = new Set(); const bots = []
    if (!global.subBots) return bots
    for (const [jid, sock] of global.subBots) { if (!sock?.user) continue; const n = cleanNum(jid); if (seen.has(n)) continue; seen.add(n); const cfg = sock.subConfig || {}; bots.push({ jid, name: sock.user?.name || cfg.name || 'Sub-Bot', number: n, status: sock.user ? 'connected' : 'disconnected', owner: cfg.owner || 'Unknown', config: cfg }) }
    return bots
}

async function sendToWhatsApp(phone, text) { try { if (!global.conn) return false; await global.conn.sendMessage(`${cleanNum(phone)}@s.whatsapp.net`, { text }); return true } catch (e) { return false } }

app.use(cors({ origin: '*', credentials: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'src', 'public')))

const requireAuth = (req, res, next) => { const tk = req.headers.authorization?.replace('Bearer ', '') || req.query.token; if (!tk || !activeSessions.has(tk)) return res.status(401).json({ error: 'No autorizado' }); req.user = activeSessions.get(tk); req.token = tk; next() }
const requireOwner = (req, res, next) => { if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' }); next() }

app.get('/api/info', (req, res) => {
    const owners = (global.owner || []).map(o => ({ number: Array.isArray(o) ? o[0] : o, name: Array.isArray(o) ? o[1] : 'Owner' }))
    const bots = getAllSubBots()
    res.json({ success: true, name: global.namebot || 'Asta Bot', logo: global.logo || '', icono: global.icono || '', description: global.description || 'Bot WhatsApp 24/7', owners, prefix: global.prefix || '.', stats: { totalBots: bots.length, connectedBots: bots.filter(b => b.status === 'connected').length, totalUsers: webUsers.size, uptime: process.uptime(), version: global.vs || '2.0.0' } })
})

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
    res.json({ valid: true, owner: t.owner, role: t.role })
})

app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regTk } = req.body
    if (!username || !password || !regTk) return res.json({ success: false, error: 'Faltan datos (usuario, contraseña, token)' })
    const tk = tokenStore.get(regTk?.toUpperCase())
    if (!tk) return res.json({ success: false, error: 'Token inválido' })
    if (tk.used) return res.json({ success: false, error: 'Token ya fue usado' })
    if (Date.now() > tk.expiresAt) return res.json({ success: false, error: 'Token expirado' })
    if (password.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })
    const uid = cleanNum(username) || username.toLowerCase().trim()
    if (!uid) return res.json({ success: false, error: 'Usuario inválido' })
    if (tk.owner !== uid && cleanNum(tk.owner) !== uid) return res.json({ success: false, error: 'Este token pertenece a otro número' })
    if (webUsers.has(uid)) return res.json({ success: false, error: 'Usuario ya registrado. Inicia sesión.' })
    webUsers.set(uid, { username: uid, password: hashPwd(password), role: tk.role, email: null, emailVerified: false, money: 0, createdAt: new Date().toISOString(), profile: { displayName: '', bio: '', avatar: '', phone: uid } })
    if (!economyData.has(uid)) { economyData.set(uid, { username: uid, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }); saveEconomy() }
    if (!profilesData.has(uid)) { profilesData.set(uid, { username: uid, displayName: '', bio: '', avatar: '', phone: uid }); saveProfiles() }
    tk.used = true; saveUsers(); saveTokens()
    const session = genTk(); activeSessions.set(session, { username: uid, role: tk.role, createdAt: new Date() })
    res.json({ success: true, token: session, username: uid, role: tk.role })
})

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.json({ success: false, error: 'Completa usuario y contraseña' })
    let uid = cleanNum(username) || username.toLowerCase().trim()
    let user = webUsers.get(uid)
    if (!user) { user = [...webUsers.values()].find(u => u.email?.toLowerCase() === username.toLowerCase()); if (user) uid = user.username }
    if (!user) { user = ensureUser(uid); if (!user || user.password !== hashPwd(password)) return res.json({ success: false, error: 'Credenciales incorrectas' }) }
    if (user.password !== hashPwd(password)) return res.json({ success: false, error: 'Credenciales incorrectas' })
    const session = genTk(); activeSessions.set(session, { username: uid, role: user.role, createdAt: new Date() })
    res.json({ success: true, token: session, username: uid, role: user.role })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username)
    if (!user) return res.status(404).json({ error: 'No encontrado' })
    const profile = profilesData.get(req.user.username) || {}
    const economy = getEconomyForUser(req.user.username)
    res.json({ success: true, user: { username: user.username, role: user.role, money: economy.money || 0, bank: economy.bank || 0, exp: economy.exp || 0, level: economy.level || 1, profile: { ...user.profile, ...profile }, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt } })
})

app.post('/api/auth/logout', requireAuth, (req, res) => { activeSessions.delete(req.token); res.json({ success: true }) })
app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.json({ success: false, error: 'Completa todos los campos' })
    if (newPassword.length < 6) return res.json({ success: false, error: 'Contraseña nueva mínimo 6 caracteres' })
    const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' })
    if (user.password !== hashPwd(currentPassword)) return res.json({ success: false, error: 'Contraseña actual incorrecta' })
    user.password = hashPwd(newPassword); saveUsers()
    res.json({ success: true, message: 'Contraseña cambiada correctamente' })
})

app.post('/api/auth/recover/whatsapp', async (req, res) => {
    const { phone } = req.body; if (!phone) return res.json({ success: false, error: 'Número requerido' })
    const uid = cleanNum(phone); const user = webUsers.get(uid) || [...webUsers.values()].find(u => cleanNum(u.username) === uid)
    if (!user) return res.json({ success: false, error: 'No existe cuenta' })
    const code = rand6(); pendingWACodes.set(uid, { code, expires: Date.now() + 10 * 60 * 1000, username: user.username })
    const sent = await sendToWhatsApp(uid, `🔑 *Código – ${global.namebot}*\n\n\`${code}\`\n\n⏳ 10 minutos`)
    res.json({ success: true, sent, message: sent ? 'Código enviado' : 'No se pudo enviar' })
})

app.post('/api/auth/recover/whatsapp/verify', (req, res) => {
    const { phone, code, newPassword } = req.body; const uid = cleanNum(phone)
    const entry = pendingWACodes.get(uid); if (!entry || Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    if (!newPassword || newPassword.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })
    const user = webUsers.get(entry.username); if (!user) return res.json({ success: false, error: 'Usuario no encontrado' })
    user.password = hashPwd(newPassword); pendingWACodes.delete(uid); saveUsers()
    res.json({ success: true })
})

app.post('/api/auth/recover/token', async (req, res) => {
    const { phone } = req.body; if (!phone) return res.json({ success: false, error: 'Número requerido' })
    const uid = cleanNum(phone); const user = ensureUser(uid)
    const tk = generateShortToken(uid, user.role)
    const sent = await sendToWhatsApp(uid, `🔑 *Token – ${global.namebot}*\n\n\`${tk}\`\n\n⏳ 24h | Solo para tu número`)
    res.json({ success: true, sent, token: tk, message: sent ? 'Token enviado' : 'Usa este token en /login' })
})

app.post('/api/auth/recover/email', async (req, res) => {
    const { email } = req.body; if (!email?.includes('@')) return res.json({ success: false, error: 'Email inválido' })
    const user = [...webUsers.values()].find(u => u.email?.toLowerCase() === email.toLowerCase() && u.emailVerified)
    if (!user) return res.json({ success: false, error: 'No hay cuenta verificada con ese correo' })
    const code = rand6(); pendingEmailCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000, pendingFor: user.username, type: 'recovery' })
    try { await sendEmail(email, '🔑 Recuperar contraseña', makeEmailHtml('Recuperar', 'Código:', code)); res.json({ success: true }) } catch (e) { res.json({ success: false, error: e.message }) }
})

app.post('/api/auth/recover/email/verify', (req, res) => {
    const { email, code, newPassword } = req.body; const entry = pendingEmailCodes.get(email?.toLowerCase())
    if (!entry || Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    if (!newPassword || newPassword.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' })
    const user = webUsers.get(entry.pendingFor); if (!user) return res.json({ success: false, error: 'Usuario no encontrado' })
    user.password = hashPwd(newPassword); pendingEmailCodes.delete(email.toLowerCase()); saveUsers()
    res.json({ success: true })
})

app.get('/api/profile', requireAuth, (req, res) => {
    const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' })
    const profile = profilesData.get(req.user.username) || {}
    const economy = getEconomyForUser(req.user.username)
    res.json({ success: true, profile: { username: user.username, displayName: profile.displayName || user.profile?.displayName || '', phone: profile.phone || user.username, role: user.role, money: economy.money || 0, bank: economy.bank || 0, exp: economy.exp || 0, level: economy.level || 1, bio: profile.bio || user.profile?.bio || '', avatar: profile.avatar || user.profile?.avatar || '', email: user.email, emailVerified: user.emailVerified || false, createdAt: user.createdAt, botLinked: !!getSubBotByOwner(user.username) } })
})

app.post('/api/profile/update', requireAuth, (req, res) => {
    const { bio, avatar, displayName } = req.body; const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' })
    if (!user.profile) user.profile = {}
    if (bio !== undefined) user.profile.bio = bio
    if (avatar !== undefined) user.profile.avatar = avatar
    if (displayName !== undefined) user.profile.displayName = String(displayName).slice(0, 40)
    let profile = profilesData.get(req.user.username) || { username: req.user.username }
    if (bio !== undefined) profile.bio = bio
    if (avatar !== undefined) profile.avatar = avatar
    if (displayName !== undefined) profile.displayName = String(displayName).slice(0, 40)
    profilesData.set(req.user.username, profile); saveUsers(); saveProfiles()
    res.json({ success: true, profile: user.profile })
})

app.delete('/api/profile', requireAuth, (req, res) => {
    const uid = req.user.username; const sub = getSubBotByOwner(uid)
    if (sub) { try { sub.sock.ev?.removeAllListeners(); if (sub.sock.ws?.readyState === 1) sub.sock.ws.close(); const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(sub.jid)); if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }); global.subBots?.delete(sub.jid); global.subBotsData?.delete(sub.jid) } catch (e) {} }
    webUsers.delete(uid); economyData.delete(uid); profilesData.delete(uid); activeSessions.delete(req.token); saveUsers(); saveEconomy(); saveProfiles()
    res.json({ success: true, message: 'Cuenta eliminada' })
})

app.post('/api/profile/email/send-code', requireAuth, async (req, res) => {
    const { email } = req.body; if (!email?.includes('@')) return res.json({ success: false, error: 'Email inválido' })
    const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' })
    const code = rand6(); pendingEmailCodes.set(email.toLowerCase(), { code, expires: Date.now() + 10 * 60 * 1000, pendingFor: user.username })
    try { await sendEmail(email, '📧 Verificar correo', makeEmailHtml('Verificar', 'Código:', code)); res.json({ success: true }) } catch (e) { res.json({ success: false, error: e.message }) }
})

app.post('/api/profile/email/verify', requireAuth, (req, res) => {
    const { email, code } = req.body; const entry = pendingEmailCodes.get(email?.toLowerCase())
    if (!entry || Date.now() > entry.expires) return res.json({ success: false, error: 'Código expirado' })
    if (entry.code !== code) return res.json({ success: false, error: 'Código incorrecto' })
    const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' })
    user.email = email.toLowerCase(); user.emailVerified = true; pendingEmailCodes.delete(email.toLowerCase()); saveUsers()
    res.json({ success: true })
})

app.delete('/api/profile/email', requireAuth, (req, res) => { const user = webUsers.get(req.user.username); if (!user) return res.status(404).json({ error: 'No encontrado' }); user.email = null; user.emailVerified = false; saveUsers(); res.json({ success: true }) })

app.get('/api/economy', requireAuth, (req, res) => { res.json({ success: true, economy: getEconomyForUser(req.user.username) }) })

app.post('/api/economy/update', requireAuth, (req, res) => {
    const { money, bank, exp, level } = req.body; const uid = req.user.username
    let data = economyData.get(uid) || { username: uid, money: 0, bank: 0, exp: 0, level: 1, lastClaim: null, lastCrime: null, inventory: [] }
    if (money !== undefined) data.money = money
    if (bank !== undefined) data.bank = bank
    if (exp !== undefined) data.exp = exp
    if (level !== undefined) data.level = level
    economyData.set(uid, data); saveEconomy()
    res.json({ success: true, economy: data })
})

app.get('/api/dashboard', requireAuth, async (req, res) => {
    const sub = getSubBotByOwner(req.user.username)
    if (!sub) return res.json({ success: true, hasBot: false })
    const { jid, sock, config } = sub; const connected = !!sock.user; let groups = []
    if (connected) { try { const all = await sock.groupFetchAllParticipating(); for (const [gJid, meta] of Object.entries(all)) { const me = meta.participants.find(p => p.id === sock.user?.jid); groups.push({ jid: gJid, name: meta.subject, participants: meta.participants.length, isAdmin: me?.admin === 'admin' || me?.admin === 'superadmin', desc: meta.desc || '' }) } } catch (e) {} }
    const economy = getEconomyForUser(req.user.username)
    res.json({ success: true, hasBot: true, bot: { jid, name: sock.user?.name || config.name || 'Sub-Bot', number: cleanNum(jid), status: connected ? 'connected' : 'disconnected', uptime: process.uptime(), config: { mode: config.mode || 'public', antiPrivate: config.antiPrivate || false, antiSpam: config.antiSpam !== false, cooldown: config.cooldown || 3000 }, groups, money: economy.money || 0, bank: economy.bank || 0 } })
})

app.post('/api/dashboard/config', requireAuth, async (req, res) => {
    const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' })
    const { name, mode, antiPrivate, antiSpam, cooldown } = req.body; const updates = {}
    if (name) updates.name = String(name).slice(0, 30)
    if (mode && ['public', 'private'].includes(mode)) updates.mode = mode
    if (typeof antiPrivate === 'boolean') updates.antiPrivate = antiPrivate
    if (typeof antiSpam === 'boolean') updates.antiSpam = antiSpam
    if (cooldown) updates.cooldown = parseInt(cooldown)
    const nc = { ...(sub.config || {}), ...updates }; if (sub.sock.subConfig) sub.sock.subConfig = nc
    try { const { saveSubConfig } = await import('./serbot.js'); saveSubConfig(cleanNum(sub.jid), updates) } catch (e) {}
    res.json({ success: true, config: nc })
})

app.post('/api/dashboard/restart', requireAuth, (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); try { sub.sock.ev?.removeAllListeners(); if (sub.sock.ws?.readyState === 1) sub.sock.ws.close() } catch (e) {} res.json({ success: true }) })
app.delete('/api/dashboard/bot', requireAuth, (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); try { sub.sock.ev?.removeAllListeners(); if (sub.sock.ws) sub.sock.ws.close(); const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(sub.jid)); if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }); global.subBots?.delete(sub.jid); global.subBotsData?.delete(sub.jid) } catch (e) { return res.status(500).json({ error: e.message }) } res.json({ success: true }) })
app.delete('/api/dashboard/session', requireAuth, (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(sub.jid)); try { if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }) } catch (e) { return res.status(500).json({ error: e.message }) } res.json({ success: true }) })

app.post('/api/bot/connect/qr', async (req, res) => {
    try { const { startWebConnection, cancelWebConnection, generateQRBuffer } = await import('./serbot.js'); if (!startWebConnection) return res.status(500).json({ success: false, error: 'serbot.js no disponible' }); const tempId = `webqr_${Date.now()}`; await startWebConnection(tempId, 'qr', { onQR: () => {}, onConnected: () => {}, onError: () => {}, onTimeout: () => {} }); let buf = null, attempts = 0; while (attempts++ < 25) { buf = await generateQRBuffer?.(tempId); if (buf) break; await new Promise(r => setTimeout(r, 1000)) } if (!buf) { cancelWebConnection?.(tempId); return res.json({ success: false, error: 'No se pudo generar el QR' }) } const fname = `qr_${tempId}.png`; fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf); setTimeout(() => { try { fs.unlinkSync(path.join(UPLOADS_DIR, fname)) } catch (e) {} }, 50000); res.json({ success: true, qrUrl: `/uploads/${fname}`, tempId, expiresIn: 45 }) } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/bot/connect/code', async (req, res) => {
    const { phoneNumber } = req.body; if (!phoneNumber) return res.json({ success: false, error: 'Número requerido' }); const uid = cleanNum(phoneNumber); if (!uid) return res.json({ success: false, error: 'Número inválido' }); ensureUser(uid)
    try { const { startWebConnection, getPairingCode } = await import('./serbot.js'); if (!startWebConnection) return res.status(500).json({ success: false, error: 'serbot.js no disponible' }); global.webPendingConnections?.delete(uid); await new Promise(r => setTimeout(r, 1500)); await startWebConnection(uid, 'code', { onCode: () => {}, onConnected: () => {}, onError: () => {}, onTimeout: () => {} }); let codeInfo = null, attempts = 0; while (attempts++ < 40) { codeInfo = getPairingCode?.(uid); if (codeInfo) break; await new Promise(r => setTimeout(r, 1000)) } if (!codeInfo) { try { const ctrl = global.webPendingConnections?.get(uid); if (ctrl) ctrl.cleanup(true) } catch (e) {} return res.json({ success: false, error: 'Tiempo agotado' }) } res.json({ success: true, code: codeInfo.formatted, rawCode: codeInfo.raw, phoneNumber: uid, expiresIn: Math.floor((codeInfo.expiresAt - Date.now()) / 1000), instructions: 'WhatsApp → ⋮ → Dispositivos vinculados → Vincular con código' }) } catch (e) { try { const ctrl = global.webPendingConnections?.get(uid); if (ctrl) ctrl.cleanup(true) } catch (e2) {} res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/bot/link', requireAuth, async (req, res) => { const { phoneNumber } = req.body; const uid = cleanNum(phoneNumber || req.user.username); try { const { linkWebSubBotToUser } = await import('./serbot.js'); const cfg = linkWebSubBotToUser?.(uid, req.user.username); res.json({ success: true, config: cfg }) } catch (e) { res.status(500).json({ success: false, error: e.message }) } })

app.get('/api/bot/status/:tempId', (req, res) => {
    const { tempId } = req.params; if (!global.webPendingConnections) return res.json({ connected: false }); const ctrl = global.webPendingConnections.get(tempId)
    if (!ctrl) { const bots = getAllSubBots(); const recent = bots.find(b => b.status === 'connected'); if (recent) return res.json({ connected: true, jid: recent.jid, number: recent.number, name: recent.name }); return res.json({ connected: false }) }
    res.json({ connected: ctrl.isConnected, status: ctrl.status, jid: ctrl.socket?.user?.jid })
})

app.post('/api/dashboard/logo', requireAuth, (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); const { zone, imageBase64 } = req.body; if (!zone || !imageBase64) return res.json({ success: false, error: 'Zona e imagen requeridas' }); try { const buf = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'); const fname = `logo_${zone}_${Date.now()}.png`; fs.writeFileSync(path.join(UPLOADS_DIR, fname), buf); const url = `/uploads/${fname}`; if (!sub.config.logos) sub.config.logos = {}; sub.config.logos[zone] = url; if (sub.sock.subConfig) sub.sock.subConfig.logos = sub.config.logos; res.json({ success: true, url }) } catch (e) { res.status(500).json({ error: e.message }) } })
app.get('/api/dashboard/logo-presets', requireAuth, (req, res) => { let files = []; try { files = fs.readdirSync(UPLOADS_DIR).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f)).map(f => ({ name: f, url: `/uploads/${f}` })) } catch (e) {} res.json({ success: true, presets: files }) })
app.delete('/api/dashboard/logo/:zone', requireAuth, (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); if (sub.config.logos) delete sub.config.logos[req.params.zone]; if (sub.sock.subConfig) sub.sock.subConfig.logos = sub.config.logos; res.json({ success: true }) })
app.post('/api/dashboard/leave-group', requireAuth, async (req, res) => { const { groupJid } = req.body; const sub = getSubBotByOwner(req.user.username); if (!sub?.sock) return res.status(404).json({ error: 'Bot no conectado' }); try { await sub.sock.groupLeave(groupJid); res.json({ success: true }) } catch (e) { res.status(500).json({ error: e.message }) } })

app.get('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => {
    const cfg = loadWelcome()[req.params.groupJid] || {}
    res.json({ success: true, config: { activo: cfg.activo !== false, caption: cfg.caption || '👋 ¡Bienvenido @{numero} a *{grupo}*!\nYa somos *{miembros}* miembros.', captionBye: cfg.captionBye || '👋 @{numero} ha salido de *{grupo}*.', titleText: cfg.titleText || '¡Bienvenido!', titleColor: cfg.titleColor || '#00D9FF', nameColor: cfg.nameColor || '#FFFFFF', groupColor: cfg.groupColor || '#CCCCCC', membersColor: cfg.membersColor || '#AAAAAA', borderColor: cfg.borderColor || '#00D9FF', borderWidth: cfg.borderWidth ?? 4, borderStyle: cfg.borderStyle || 'solid', avatarX: cfg.avatarX ?? 130, avatarY: cfg.avatarY ?? 150, avatarRadius: cfg.avatarRadius ?? 70, avatarShape: cfg.avatarShape || 'circle', bgGradient1: cfg.bgGradient1 || '#0B0F19', bgGradient2: cfg.bgGradient2 || '#1a1a3e', backgroundImage: cfg.backgroundImage || '', overlayOpacity: cfg.overlayOpacity ?? 0.4, textShadow: cfg.textShadow !== false, titleSize: cfg.titleSize || 28, nameSize: cfg.nameSize || 20, groupSize: cfg.groupSize || 16, extraTexts: cfg.extraTexts || [], stickers: cfg.stickers || [], designFromZero: cfg.designFromZero || false, customCSS: cfg.customCSS || '', elements: cfg.elements || [] } })
})

app.post('/api/dashboard/welcome/:groupJid', requireAuth, (req, res) => { const all = loadWelcome(); all[req.params.groupJid] = { ...all[req.params.groupJid], ...req.body, updatedAt: new Date().toISOString() }; saveWelcome(all); res.json({ success: true, config: all[req.params.groupJid] }) })

app.get('/api/dashboard/antilink/:groupJid', requireAuth, async (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); try { const { getAntilinkConfig } = await import('./antilink-detector.js'); const config = getAntilinkConfig(req.params.groupJid) || {}; res.json({ success: true, config }) } catch (e) { res.status(500).json({ error: e.message }) } })

app.post('/api/dashboard/antilink/:groupJid', requireAuth, async (req, res) => { const sub = getSubBotByOwner(req.user.username); if (!sub) return res.status(404).json({ error: 'Bot no encontrado' }); try { const { setAntilinkConfig } = await import('./antilink-detector.js'); const updatedConfig = setAntilinkConfig(req.params.groupJid, req.body); res.json({ success: true, config: updatedConfig }) } catch (e) { res.status(500).json({ error: e.message }) } })

const AI_APIS = [
    { name: 'P1', key: 'sk-q7Y22pUkANXdqJRwnEVqfWQcvrA1UPxemAnChLmMlAEpN6zU1wFztlJKhoclm7IeoK_iDJaf2QFczOg', url: 'https://api.routeway.ai/v1/chat/completions', model: 'llama-3.3-70b-instruct:free' },
    { name: 'P2', key: 'sk-yDpbFiicXXqW7QWNPfhHJlg3LvZBuKS0qelLMt5HJQyl72K3CB35eB3kiha5eJKq-qmQc8qoHPGxlV569aeCxfo', url: 'https://api.routeway.ai/v1/chat/completions', model: 'llama-3.3-70b-instruct:free' },
    { name: 'P3', key: 'sk-aYtfRulTFY4ktguZSpp0ic8l7HFsr2U_mXqsRzLgw_ZpGK5RmSlzWe_L8ZWItg', url: 'https://api.routeway.ai/v1/chat/completions', model: 'nemotron-3-nano-30b-a3b:free' }
]

async function callAI(messages, system, idx = 0) { if (idx >= AI_APIS.length) throw new Error('AI no disponible'); const { name, key, url, model } = AI_APIS[idx]; try { const body = { model, max_tokens: 1024, messages: system ? [{ role: 'system', content: system }, ...messages] : messages }; const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify(body), signal: AbortSignal.timeout(22000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); return d.choices?.[0]?.message?.content || 'Sin respuesta' } catch (e) { console.warn(`AI ${name}:`, e.message); return callAI(messages, system, idx + 1) } }

function getBotCommands() { const dir = path.join(process.cwd(), 'src', 'commands'); const cmds = []; const scan = (d) => { try { fs.readdirSync(d).forEach(f => { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) { scan(fp); return } if (!f.endsWith('.js')) return; try { const c = fs.readFileSync(fp, 'utf-8'); (c.match(/handler\.command\s*=\s*\[([^\]]+)\]/g) || []).forEach(m => { const inner = m.match(/\[([^\]]+)\]/)?.[1] || ''; inner.split(',').forEach(x => { const cmd = x.trim().replace(/['"`]/g, ''); if (cmd) cmds.push(cmd) }) }) } catch (e) {} }) } catch (e) {} }; scan(dir); return [...new Set(cmds)].slice(0, 100) }

app.get('/api/chat/commands', requireAuth, (req, res) => { res.json({ success: true, commands: getBotCommands(), prefix: global.prefix || '.' }) })

app.post('/api/chat/message', requireAuth, async (req, res) => {
    const { message, history = [] } = req.body; if (!message?.trim()) return res.json({ success: false, error: 'Mensaje vacío' })
    const prefix = global.prefix || '.'; const msgClean = message.trim(); const availCmds = getBotCommands()
    const cmdRaw = (msgClean.startsWith(prefix) ? msgClean.slice(prefix.length) : msgClean).split(' ')[0].toLowerCase()
    const isCmd = availCmds.map(c => c.toLowerCase()).includes(cmdRaw)
    const userId = req.user.username

    if (isCmd) {
        const eco = getEconomyForUser(userId)
        const fakeMap = {
            ping: '🏓 *Pong!* El bot está activo.',
            menu: `╔══════════════╗\n║ ${global.namebot || 'ASTA BOT'} ║\n╚══════════════╝\n\n📋 Comandos: ${availCmds.slice(0, 20).join(' · ')}`,
            info: `*${global.namebot} v${global.vs}*\n📊 Bots: ${global.subBots?.size || 0}`,
            balance: `💰 *Balance de @${userId}*\n💵 Efectivo: $${(eco.money||0).toLocaleString()}\n🏦 Banco: $${(eco.bank||0).toLocaleString()}\n💎 Total: $${((eco.money||0)+(eco.bank||0)).toLocaleString()}`,
            perfil: `👤 *Perfil de @${userId}*\n📱 Número: ${userId}\n💰 Dinero: $${(eco.money||0).toLocaleString()}\n🏦 Banco: $${(eco.bank||0).toLocaleString()}\n⭐ Nivel: ${eco.level||1}`,
            bal: `💰 *Balance de @${userId}*\n💵 Efectivo: $${(eco.money||0).toLocaleString()}\n🏦 Banco: $${(eco.bank||0).toLocaleString()}`,
            diario: `🎁 @${userId} reclamó su recompensa diaria.`,
            crimen: `🦹 @${userId} intentó cometer un crimen...`,
            depositar: `🏦 @${userId} depositó dinero.`,
            retirar: `🏦 @${userId} retiró dinero.`,
            nivel: `⭐ @${userId} Nivel: ${eco.level||1} | Exp: ${eco.exp||0}/${(eco.level||1)*100}`
        }
        if (fakeMap[cmdRaw]) return res.json({ success: true, reply: fakeMap[cmdRaw], isBot: true, cmd: cmdRaw })
        const sys = `Eres ${global.namebot}. Usuario: ${userId}. Responde como si fuera WhatsApp. Sé breve.`
        try { const reply = await callAI([{ role: 'user', content: msgClean }], sys); return res.json({ success: true, reply, isBot: true, cmd: cmdRaw }) } catch (e) {}
    }
    const sys = `Eres ${global.namebot}. Solo respondes a comandos. Si no es comando di "Solo comandos: .menu"`
    try { const reply = await callAI([...history.slice(-10), { role: 'user', content: msgClean }], sys); res.json({ success: true, reply, isBot: false }) } catch (e) { res.status(500).json({ success: false, error: e.message }) }
})

app.post('/api/download', requireAuth, async (req, res) => { const { url, type } = req.body; if (!url) return res.json({ success: false, error: 'URL requerida' }); const apis = global.Api || {}; try { const domain = new URL(url).hostname; let result = null; if (domain.includes('youtube') || domain.includes('youtu.be')) { if (apis.youtube) result = await apis.youtube(url, type) } else if (domain.includes('instagram')) { if (apis.instagram) result = await apis.instagram(url, type) } else if (domain.includes('tiktok')) { if (apis.tiktok) result = await apis.tiktok(url, type) } else if (domain.includes('facebook') || domain.includes('fb')) { if (apis.facebook) result = await apis.facebook(url, type) } if (!result) return res.json({ success: false, error: 'API no configurada' }); res.json({ success: true, data: result }) } catch (e) { res.status(500).json({ success: false, error: e.message }) } })

app.get('/api/admin/stats', requireAuth, requireOwner, (req, res) => { const bots = getAllSubBots(); res.json({ success: true, stats: { totalBots: bots.length, connectedBots: bots.filter(b => b.status === 'connected').length, totalUsers: webUsers.size, uptime: process.uptime(), memory: process.memoryUsage() }, bots }) })
app.get('/api/admin/bots', requireAuth, requireOwner, (req, res) => res.json({ success: true, bots: getAllSubBots() }))
app.post('/api/admin/bot/:jid/restart', requireAuth, requireOwner, (req, res) => { const jid = decodeURIComponent(req.params.jid); const sock = global.subBots?.get(jid) || global.subBots?.get(cleanNum(jid)); try { if (sock) { sock.ev?.removeAllListeners(); if (sock.ws?.readyState === 1) sock.ws.close() } } catch (e) {} res.json({ success: true }) })
app.delete('/api/admin/bot/:jid', requireAuth, requireOwner, (req, res) => { const jid = decodeURIComponent(req.params.jid); const num = cleanNum(jid); try { const sock = global.subBots?.get(jid) || global.subBots?.get(num); if (sock) { sock.ev?.removeAllListeners(); if (sock.ws) sock.ws.close() } const sp = path.join(process.cwd(), 'session', 'Sub-bots', num); if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }); global.subBots?.delete(jid); global.subBots?.delete(num); global.subBotsData?.delete(jid); global.subBotsData?.delete(num) } catch (e) { return res.status(500).json({ error: e.message }) } res.json({ success: true }) })
app.delete('/api/admin/bot/:jid/session', requireAuth, requireOwner, (req, res) => { const sp = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(decodeURIComponent(req.params.jid))); try { if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true, force: true }) } catch (e) { return res.status(500).json({ error: e.message }) } res.json({ success: true }) })
app.get('/api/admin/users', requireAuth, requireOwner, (req, res) => { res.json({ success: true, users: [...webUsers.values()].map(u => ({ username: u.username, role: u.role, money: u.money || 0, email: u.email, emailVerified: u.emailVerified, createdAt: u.createdAt })) }) })
app.post('/api/admin/users', requireAuth, requireOwner, (req, res) => { const { username, password, role = 'user' } = req.body; if (!username || !password) return res.json({ success: false, error: 'Faltan datos' }); if (password.length < 6) return res.json({ success: false, error: 'Contraseña mínimo 6 caracteres' }); const uid = cleanNum(username) || username.toLowerCase().trim(); if (webUsers.has(uid)) return res.json({ success: false, error: 'Ya existe' }); webUsers.set(uid, { username: uid, password: hashPwd(password), role, money: 0, createdBy: req.user.username, createdAt: new Date().toISOString(), profile: { displayName: '', bio: '', avatar: '', phone: uid } }); saveUsers(); res.json({ success: true, message: 'Usuario creado' }) })
app.delete('/api/admin/users/:u', requireAuth, requireOwner, (req, res) => { const uid = cleanNum(req.params.u) || req.params.u; if (!webUsers.has(uid)) return res.status(404).json({ error: 'No encontrado' }); webUsers.delete(uid); economyData.delete(uid); profilesData.delete(uid); saveUsers(); saveEconomy(); saveProfiles(); res.json({ success: true }) })
app.post('/api/admin/users/:u/money', requireAuth, requireOwner, (req, res) => { const uid = cleanNum(req.params.u) || req.params.u; const user = webUsers.get(uid); if (!user) return res.status(404).json({ error: 'No encontrado' }); const { action, amount } = req.body; const prev = user.money || 0; if (action === 'add') user.money = prev + parseInt(amount); else if (action === 'remove') user.money = Math.max(0, prev - parseInt(amount)); else if (action === 'set') user.money = parseInt(amount); saveUsers(); res.json({ success: true, user: { username: user.username, money: user.money, previousMoney: prev } }) })
app.post('/api/admin/tokens/generate', requireAuth, requireOwner, (req, res) => { const { role = 'user' } = req.body; res.json({ success: true, token: generateShortToken(req.user.username, role), expiresIn: '24 horas' }) })

const ADMIN_SYS = `Eres asistente de desarrollo para Asta Bot. Crea comandos completos, analiza código, detecta bugs. Responde en español.`

function getBotDocs() { const docs = {};['src/commands', 'lib', 'src/database'].forEach(d => { const full = path.join(process.cwd(), d); try { if (!fs.existsSync(full)) return; fs.readdirSync(full).filter(f => f.endsWith('.js')).slice(0, 15).forEach(f => { try { docs[`${d}/${f}`] = fs.readFileSync(path.join(full, f), 'utf-8').slice(0, 2500) } catch (e) {} }) } catch (e) {} }); return docs }

app.post('/api/admin/ai/chat', requireAuth, requireOwner, async (req, res) => { const { message, history = [], includeDocuments = false } = req.body; if (!message?.trim()) return res.json({ success: false, error: 'Mensaje vacío' }); let sys = ADMIN_SYS; if (includeDocuments) { const docs = getBotDocs(); sys += '\n\nDocs:\n' + Object.entries(docs).map(([k, v]) => `### ${k}\n${v.slice(0, 400)}`).join('\n\n') } try { res.json({ success: true, reply: await callAI([...history.slice(-15), { role: 'user', content: message }], sys) }) } catch (e) { res.status(500).json({ success: false, error: e.message }) } })
app.post('/api/admin/ai/analyze', requireAuth, requireOwner, async (req, res) => { const docs = getBotDocs(); try { res.json({ success: true, analysis: await callAI([{ role: 'user', content: `Analiza Asta Bot. Archivos: ${Object.keys(docs).join(', ')}. Da resumen, mejoras, bugs.` }], ADMIN_SYS) }) } catch (e) { res.status(500).json({ success: false, error: e.message }) } })
app.get('/api/admin/documents', requireAuth, requireOwner, (req, res) => { const docs = getBotDocs(); res.json({ success: true, documents: Object.keys(docs).map(k => ({ path: k, size: docs[k].length })) }) })
app.get('/api/admin/documents/:file(*)', requireAuth, requireOwner, (req, res) => { const fp = path.join(process.cwd(), req.params.file); if (!fp.startsWith(process.cwd())) return res.status(403).json({ error: 'Acceso denegado' }); try { res.json({ success: true, content: fs.readFileSync(fp, 'utf-8') }) } catch (e) { res.status(404).json({ error: 'No encontrado' }) } })

io.on('connection', socket => { socket.emit('info', { name: global.namebot || 'Asta Bot', logo: global.logo, icono: global.icono }); socket.on('subscribe-logs', tk => { const s = activeSessions.get(tk); if (s?.role === 'owner') { socket.join('admin-logs'); socket.emit('logs-subscribed', true) } }) })
global.emitLog = (type, message, data = {}) => io.to('admin-logs').emit('log', { type, message, data, time: new Date().toISOString() })

const PUB = path.join(__dirname, '..', 'src', 'public')
app.get('/', (_, res) => res.sendFile(path.join(PUB, 'index.html')))
app.get('/login', (_, res) => res.sendFile(path.join(PUB, 'login.html')))
app.get('/dashboard', (_, res) => res.sendFile(path.join(PUB, 'dashboard.html')))
app.get('/admin', (_, res) => res.sendFile(path.join(PUB, 'admin.html')))
app.get('/vincular', (_, res) => res.sendFile(path.join(PUB, 'vincular.html')))

httpServer.listen(PORT, '0.0.0.0', () => console.log(`\n🌐 Asta Web → http://localhost:${PORT}`))

export { app, io }
