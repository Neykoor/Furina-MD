import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createServer } from 'http'
import { Server } from 'socket.io'
import crypto from 'crypto'
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

const activeSessions = new Map()
const webTokens = new Map()
const webUsers = new Map()

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

function getSubBotSocket(username) {
    for (const [jid, sock] of global.subBots || []) {
        const cfg = sock.subConfig || getSubConfig(jid)
        if (cfg?.owner === username || cleanNum(cfg?.owner) === cleanNum(username)) {
            return { jid, sock, config: cfg }
        }
    }
    return null
}

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

app.post('/api/tokens/create', (req, res) => {
    const { secret, owner, role = 'user' } = req.body
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

app.get('/api/tokens/verify/:token', (req, res) => {
    const t = webTokens.get(req.params.token)
    if (!t) return res.json({ valid: false, error: 'Token no existe' })
    if (t.used) return res.json({ valid: false, error: 'Token ya usado' })
    res.json({ valid: true, owner: t.owner, role: t.role })
})

app.post('/api/auth/register', (req, res) => {
    const { username, password, token: regToken } = req.body

    if (!username || !password || !regToken) {
        return res.json({ success: false, error: 'Faltan datos' })
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
        createdAt: new Date().toISOString()
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
    res.json({ success: true, user: req.user })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
    activeSessions.delete(req.token)
    res.json({ success: true })
})

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

app.post('/api/dashboard/logo', requireAuth, async (req, res) => {
    const { username } = req.user
    const { zone, imageBase64 } = req.body
    const subData = getSubBotSocket(username)

    if (!subData) return res.status(404).json({ error: 'Sub-bot no encontrado' })

    try {
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

        res.json({ success: true, url: publicUrl })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

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
                onCode: (formatted, raw) => {},
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
                onQR: (qrData, qrBase64) => {},
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
        logs: logs.slice(-100)
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

        await startWebConnection(cleanNum(jid), 'qr', {
            onConnected: () => {},
            onError: () => {}
        })

        res.json({ success: true, message: 'Bot reiniciado' })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

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

app.get('/api/admin/users', requireAuth, requireRole('owner'), (req, res) => {
    const users = [...webUsers.values()].map(u => ({
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        createdBy: u.createdBy
    }))
    res.json({ success: true, users })
})

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
