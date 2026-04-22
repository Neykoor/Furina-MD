import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import crypto from 'crypto'
import QRCode from 'qrcode'
import { createSubBot, getSubConfig, saveSubConfig, cleanSubBotCache } from './serbot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const PORT = process.env.PORT || 24683
const HOST = '0.0.0.0'

const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true }
})

// ─── ESTADO GLOBAL ───
const activeSessions = new Map()      // token -> {username, role, createdAt}
const webTokens = new Map()           // tokenValue -> {owner, createdAt, used}
const webUsers = new Map()            // username -> {password, role, owner, createdAt}

// Cargar usuarios guardados
const USERS_FILE = './webusers.json'
const TOKENS_FILE = './webtokens.json'

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
    } catch (e) { console.error('Error cargando datos web:', e) }
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify([...webUsers.values()], null, 2))
}

function saveTokens() {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify([...webTokens.values()], null, 2))
}

loadData()

// ─── MIDDLEWARE ───
app.use(cors({ origin: "*", credentials: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'src', 'public')))

const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token || req.cookies?.token
    if (!token || !activeSessions.has(token)) {
        return res.status(401).json({ error: 'No autorizado' })
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

function hashPassword(pwd) {
    return crypto.createHash('sha256').update(pwd + 'asta-salt').digest('hex')
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex')
}

// ─── HELPERS ───
function getSubBotSocket(username) {
    // Buscar sub-bot donde el owner sea este usuario
    for (const [jid, sock] of global.subBots || []) {
        const cfg = sock.subConfig || getSubConfig(jid)
        if (cfg?.owner === username || cleanNum(cfg?.owner) === cleanNum(username)) {
            return { jid, sock, config: cfg }
        }
    }
    return null
}

function cleanNum(jid) {
    if (!jid) return ''
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// ═══════════════════════════════════════════════════════════════
// API: INFORMACIÓN PÚBLICA (Landing)
// ═══════════════════════════════════════════════════════════════

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
        logo: global.logo || '',
        icono: global.icono || '',
        description: global.description || 'Bot WhatsApp 24/7 con sistema de Sub-Bots y Web Dashboard',
        owners,
        stats,
        features: [
            'Sub-Bots 24/7',
            'Panel Web de Control',
            'Gestión de Grupos',
            'Sistema Premium',
            'Juegos RPG & Gacha'
        ]
    })
})

// ═══════════════════════════════════════════════════════════════
// API: TOKENS (Generados desde el bot con #token)
// ═══════════════════════════════════════════════════════════════

// Crear token (llamado desde el bot)
app.post('/api/tokens/create', (req, res) => {
    const { secret, owner, role = 'user' } = req.body
    // Validar secret key del bot (opcional, puedes poner una clave fija)
    if (secret !== global.webSecret && secret !== 'asta-web-2024') {
        return res.status(403).json({ error: 'Secret inválido' })
    }

    const token = generateToken()
    webTokens.set(token, {
        token,
        owner: cleanNum(owner),
        role,
        createdAt: Date.now(),
        used: false
    })
    saveTokens()

    res.json({ success: true, token })
})

// Verificar token válido
app.get('/api/tokens/verify/:token', (req, res) => {
    const t = webTokens.get(req.params.token)
    if (!t) return res.json({ valid: false, error: 'Token no existe' })
    if (t.used) return res.json({ valid: false, error: 'Token ya usado' })
    res.json({ valid: true, owner: t.owner, role: t.role })
})

// ═══════════════════════════════════════════════════════════════
// API: AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════

app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regToken } = req.body

    if (!username || !password || !regToken) {
        return res.json({ success: false, error: 'Faltan datos' })
    }

    // Verificar token de registro
    const t = webTokens.get(regToken)
    if (!t) return res.json({ success: false, error: 'Token inválido' })
    if (t.used) return res.json({ success: false, error: 'Token ya usado' })

    const cleanUser = cleanNum(username)
    if (webUsers.has(cleanUser)) {
        return res.json({ success: false, error: 'Usuario ya existe' })
    }

    // Crear usuario
    webUsers.set(cleanUser, {
        username: cleanUser,
        password: hashPassword(password),
        role: t.role,
        owner: t.owner,
        createdAt: new Date().toISOString()
    })

    t.used = true
    saveUsers()
    saveTokens()

    // Crear sesión
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
    res.json({ success: true, user: req.user })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
    activeSessions.delete(req.token)
    res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════
// API: DASHBOARD USUARIO (Sub-Bot)
// ═══════════════════════════════════════════════════════════════

app.get('/api/dashboard', requireAuth, async (req, res) => {
    const { username } = req.user
    const subData = getSubBotSocket(username)

    if (!subData) {
        return res.json({
            success: true,
            hasBot: false,
            message: 'No tienes un Sub-Bot vinculado'
        })
    }

    const { jid, sock, config } = subData
    const wsState = sock.ws?.readyState
    const isConnected = wsState === 1

    // Obtener grupos
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
                antiSpam: config.antiSpam || true,
                cooldown: config.cooldown || 3000
            },
            groups
        }
    })
})

// Actualizar config del sub-bot
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

// Subir logo (base64)
app.post('/api/dashboard/logo', requireAuth, async (req, res) => {
    const { username } = req.user
    const { zone, imageBase64 } = req.body
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
        // Guardar imagen en archivo
        const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        const fileName = `logo_${zone}_${Date.now()}.png`
        const logoPath = path.join(process.cwd(), 'src', 'public', 'uploads', fileName)

        if (!fs.existsSync(path.dirname(logoPath))) {
            fs.mkdirSync(path.dirname(logoPath), { recursive: true })
        }

        fs.writeFileSync(logoPath, buffer)
        const publicUrl = `/uploads/${fileName}`

        // Actualizar config
        const logos = { ...(subData.config.logos || {}) }
        logos[zone] = publicUrl
        saveSubConfig(subData.jid, { logos })

        res.json({ success: true, url: publicUrl })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Salir de grupo
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

// Info de grupo específico
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

// ═══════════════════════════════════════════════════════════════
// API: SOLICITAR SUB-BOT DESDE WEB (QR / CODE)
// ═══════════════════════════════════════════════════════════════

const pendingWebRequests = new Map() // id -> {type, number, resolve, reject}

app.post('/api/request-bot', async (req, res) => {
    const { type, phoneNumber } = req.body // type: 'qr' | 'code'

    if (!phoneNumber) {
        return res.json({ success: false, error: 'Número requerido' })
    }

    const cleanPhone = cleanNum(phoneNumber)
    const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', cleanPhone)

    // Si ya existe y está conectado
    if (global.subBots.has(cleanPhone)) {
        const sock = global.subBots.get(cleanPhone)
        if (sock.ws?.readyState === 1) {
            return res.json({ success: false, error: 'Este número ya tiene un bot activo' })
        }
    }

    const requestId = crypto.randomBytes(16).toString('hex')

    try {
        if (type === 'code') {
            // Crear sub-bot en modo código
            const sock = await createSubBot({
                sessionPath,
                userId: cleanPhone,
                isAutoStart: false,
                mcode: true
            })

            // Esperar a que se genere el código (evento)
            let code = null
            const codePromise = new Promise((resolve) => {
                const checkCode = setInterval(() => {
                    const sent = global.sentCodes?.get(cleanPhone)
                    if (sent?.type === 'code') {
                        clearInterval(checkCode)
                        resolve(sent.code)
                    }
                }, 1000)
                setTimeout(() => { clearInterval(checkCode); resolve(null) }, 60000)
            })

            code = await codePromise

            if (!code) {
                return res.json({ success: false, error: 'Tiempo agotado generando código' })
            }

            res.json({
                success: true,
                requestId,
                type: 'code',
                code: code.match(/.{1,4}/g)?.join('-') || code,
                instructions: 'Abre WhatsApp > ⋮ > Dispositivos vinculados > Vincular con código'
            })

        } else {
            // Modo QR
            const qrPromise = new Promise((resolve, reject) => {
                pendingWebRequests.set(requestId, { type: 'qr', resolve, reject })
                setTimeout(() => {
                    pendingWebRequests.delete(requestId)
                    reject(new Error('Timeout QR'))
                }, 45000)
            })

            // Crear sub-bot (el QR se generará y se capturará por evento)
            createSubBot({
                sessionPath,
                userId: cleanPhone,
                isAutoStart: false,
                mcode: false
            }).catch(() => { })

            const qrData = await qrPromise

            // Generar imagen QR
            const qrBuffer = await QRCode.toBuffer(qrData, {
                scale: 8,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: { dark: '#00ff88', light: '#0a0a0a' }
            })

            const qrFile = `qr_${requestId}.png`
            const qrPath = path.join(process.cwd(), 'src', 'public', 'uploads', qrFile)
            fs.writeFileSync(qrPath, qrBuffer)

            res.json({
                success: true,
                requestId,
                type: 'qr',
                qrUrl: `/uploads/${qrFile}`,
                expiresIn: 45
            })
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
})

// Webhook interno para recibir QR desde serbot.js
app.post('/api/internal/qr-callback', (req, res) => {
    const { requestId, qr, status, error } = req.body

    const pending = pendingWebRequests.get(requestId)
    if (!pending) return res.json({ ok: false })

    if (status === 'success' && qr) {
        pending.resolve(qr)
    } else {
        pending.reject(new Error(error || 'QR failed'))
    }

    pendingWebRequests.delete(requestId)
    res.json({ ok: true })
})

// ═══════════════════════════════════════════════════════════════
// API: ADMIN / OWNER
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/stats', requireAuth, requireRole('owner'), (req, res) => {
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
            uptime: process.uptime()
        })
    }

    // Logs de errores (simulado - en producción guardar en archivo)
    const logs = global.webLogs || []

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
        logs: logs.slice(-100) // últimos 100 logs
    })
})

// Consola de comandos (ejecutar comandos en bots)
app.post('/api/admin/exec', requireAuth, requireRole('owner'), async (req, res) => {
    const { target, command } = req.body // target: 'all' | jid

    const results = []

    if (target === 'all') {
        for (const [jid, sock] of global.subBots || []) {
            if (sock.ws?.readyState !== 1) continue
            try {
                // Aquí puedes implementar ejecución de comandos
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

// Forzar reinicio de sub-bot
app.post('/api/admin/restart-bot', requireAuth, requireRole('owner'), async (req, res) => {
    const { jid } = req.body
    const sock = global.subBots.get(jid)
    if (!sock) return res.status(404).json({ error: 'Bot no encontrado' })

    try {
        const cfg = getSubConfig(jid)
        const sessionPath = path.join(process.cwd(), 'session', 'Sub-bots', cleanNum(jid))

        sock.ev?.removeAllListeners()
        if (sock.ws?.readyState === 1) sock.ws.close()

        await cleanSubBotCache(cleanNum(jid))
        await new Promise(r => setTimeout(r, 2000))

        await createSubBot({
            sessionPath,
            userId: cleanNum(jid),
            isAutoStart: true,
            savedConfig: cfg
        })

        res.json({ success: true, message: 'Bot reiniciado' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Eliminar sesión de sub-bot
app.post('/api/admin/delete-bot', requireAuth, requireRole('owner'), (req, res) => {
    const { jid } = req.body
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

        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Crear usuario admin (solo owner)
app.post('/api/admin/create-user', requireAuth, requireRole('owner'), (req, res) => {
    const { username, password, role = 'user' } = req.body
    const cleanUser = cleanNum(username)

    if (webUsers.has(cleanUser)) {
        return res.json({ success: false, error: 'Usuario ya existe' })
    }

    webUsers.set(cleanUser, {
        username: cleanUser,
        password: hashPassword(password),
        role,
        createdBy: req.user.username,
        createdAt: new Date().toISOString()
    })

    saveUsers()
    res.json({ success: true, message: 'Usuario creado' })
})

// Listar todos los usuarios
app.get('/api/admin/users', requireAuth, requireRole('owner'), (req, res) => {
    const users = [...webUsers.values()].map(u => ({
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        createdBy: u.createdBy
    }))
    res.json({ success: true, users })
})

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO - TIEMPO REAL
// ═══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
    console.log('🌐 Cliente conectado:', socket.id)

    // Enviar info inicial
    socket.emit('info', {
        name: global.namebot || 'Asta Bot',
        logo: global.logo,
        icono: global.icono
    })

    // Suscribirse a logs (admin)
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

// Helper para emitir logs
global.emitLog = (type, message, data = {}) => {
    io.to('admin-logs').emit('log', { type, message, data, time: new Date().toISOString() })
}

// ═══════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════

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

httpServer.listen(PORT, HOST, () => {
    console.log(chalk.cyan(`\n🌐 Asta Web iniciado`))
    console.log(chalk.cyan(`🔗 http://localhost:${PORT}`))
    console.log(chalk.gray(`📁 Public: src/public/`))
})

export { app, io }