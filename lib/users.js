// lib/users.js
// ══════════════════════════════════════════════════════════════════
// Gestión unificada de usuarios (economía + perfil en un solo archivo)
// Importar desde aquí — NO desde web.js (ese inicia el servidor HTTP)
// ══════════════════════════════════════════════════════════════════
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR  = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

// ── Helpers ─────────────────────────────────────────────────────
export const cleanNum = n => String(n || '').replace(/[^0-9]/g, '')
export const hashPwd  = p => crypto.createHash('sha256').update(p + 'asta-salt-2024').digest('hex')

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ── Cargar todos los usuarios ────────────────────────────────────
export function loadUsers() {
    try {
        ensureDir()
        if (!fs.existsSync(USERS_FILE)) {
            // Primera vez: crear owners desde global.owner
            const defaults = []
            if (global.owner && Array.isArray(global.owner)) {
                for (const o of global.owner) {
                    const phone = Array.isArray(o) ? o[0] : o
                    const name  = Array.isArray(o) ? o[1] : 'Owner'
                    defaults.push(makeUser(cleanNum(phone), 'owner', name))
                }
            }
            fs.writeFileSync(USERS_FILE, JSON.stringify(defaults, null, 2))
            return defaults
        }
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'))
    } catch (e) {
        console.error('loadUsers error:', e.message)
        return []
    }
}

// ── Guardar todos los usuarios ───────────────────────────────────
export function saveUsers(users) {
    try {
        ensureDir()
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
    } catch (e) {
        console.error('saveUsers error:', e.message)
    }
}

// ── Estructura base de un usuario nuevo ─────────────────────────
function makeUser(username, role = 'user', displayName = '') {
    return {
        username,
        password: hashPwd('default'),
        role,
        email: null,
        emailVerified: false,
        money: role === 'owner' ? 999999 : 0,
        bank:  0,
        exp:   0,
        level: role === 'owner' ? 99 : 1,
        lastClaim: null,
        createdAt: new Date().toISOString(),
        profile: {
            displayName: displayName || '',
            bio: '',
            avatar: '',
            phone: username
        }
    }
}

// ── Obtener un usuario (lo crea si no existe) ────────────────────
export function getOrCreateUser(username) {
    const uid = cleanNum(username) || username
    let users = loadUsers()
    let user  = users.find(u => u.username === uid)

    if (!user) {
        user = makeUser(uid)
        users.push(user)
        saveUsers(users)
    }

    // Asegurar que tiene todos los campos (migraciones)
    let updated = false
    if (user.money    === undefined) { user.money    = 0;    updated = true }
    if (user.bank     === undefined) { user.bank     = 0;    updated = true }
    if (user.exp      === undefined) { user.exp      = 0;    updated = true }
    if (user.level    === undefined) { user.level    = 1;    updated = true }
    if (user.lastClaim === undefined){ user.lastClaim = null; updated = true }
    if (!user.profile) { user.profile = { displayName: '', bio: '', avatar: '', phone: uid }; updated = true }

    if (updated) {
        const idx = users.findIndex(u => u.username === uid)
        if (idx !== -1) { users[idx] = user; saveUsers(users) }
    }

    return user
}

// ── Actualizar campos de un usuario ─────────────────────────────
export function updateUser(username, updates) {
    const uid = cleanNum(username) || username
    let users = loadUsers()
    const idx = users.findIndex(u => u.username === uid)
    if (idx === -1) return null
    users[idx] = { ...users[idx], ...updates }
    saveUsers(users)
    return users[idx]
}

// ── Crear usuario (registro) ─────────────────────────────────────
export function createUser(username, password, role = 'user') {
    const uid = cleanNum(username) || username.toLowerCase().trim()
    let users = loadUsers()
    if (users.find(u => u.username === uid)) return null // Ya existe
    const user = { ...makeUser(uid, role), password: hashPwd(password) }
    users.push(user)
    saveUsers(users)
    return user
}
