 semanales (más difíciles, mejores recompensas)
    weekly: [
        { id: 'w_minar_30',    tipo: 'weekly', nombre: '⛏️ Maestro Minero',     descripcion: 'Minar 30 veces',             objetivo: { accion: 'minar', cantidad: 30 },     recompensa: { money: 5000, exp: 200, item: 'pico_hierro' } },
        { id: 'w_pescar_20',   tipo: 'weekly', nombre: '🎣 Rey de la Pesca',    descripcion: 'Pescar 20 veces',            objetivo: { accion: 'pescar', cantidad: 20 },    recompensa: { money: 4000, exp: 180, item: 'caña_oro' } },
        { id: 'w_cazar_15',    tipo: 'weekly', nombre: '🏹 Gran Cazador',       descripcion: 'Cazar 15 veces',             objetivo: { accion: 'cazar', cantidad: 15 },     recompensa: { money: 6000, exp: 250, item: 'arco_hierro' } },
        { id: 'w_diamante_3',  tipo: 'weekly', nombre: '💎 Coleccionista',      descripcion: 'Encontrar 3 diamantes',      objetivo: { accion: 'encontrar', item: 'diamante', cantidad: 3 }, recompensa: { money: 10000, exp: 400, item: 'pico_oro' } },
        { id: 'w_legendario_1',tipo: 'weekly', nombre: '👑 Cazador Legendario', descripcion: 'Encontrar 1 item legendario',objetivo: { accion: 'encontrar_legendario', cantidad: 1 }, recompensa: { money: 15000, exp: 500, item: 'espada_diamante' } },
        { id: 'w_craftear_10', tipo: 'weekly', nombre: '🔨 Maestro Artesano',   descripcion: 'Craftear 10 items',          objetivo: { accion: 'craftear', cantidad: 10 },   recompensa: { money: 8000, exp: 300, item: 'amuleto_esmeralda' } },
        { id: 'w_money_50k',   tipo: 'weekly', nombre: '💰 Magnate',            descripcion: 'Ganar $50,000 en total',     objetivo: { accion: 'ganar_dinero', cantidad: 50000 }, recompensa: { money: 10000, exp: 350, item: 'anillo_oro' } },
        { id: 'w_todos_10',    tipo: 'weekly', nombre: '🌟 Aventurero Completo', descripcion: 'Hacer 10 de cada actividad', objetivo: { accion: 'mixto', minar: 10, pescar: 10, cazar: 10, recolectar: 10 }, recompensa: { money: 12000, exp: 450, item: 'corona_diamante' } },
    ],
    // Logros (permanentes, recompensas únicas)
    achievement: [
        { id: 'a_minar_100',   tipo: 'achievement', nombre: '⛏️ Minero Veterano',    descripcion: 'Minar 100 veces',            objetivo: { accion: 'minar', cantidad: 100 },    recompensa: { money: 10000, exp: 500, titulo: 'Minero Veterano' } },
        { id: 'a_pescar_100',  tipo: 'achievement', nombre: '🎣 Pescador Experto',   descripcion: 'Pescar 100 veces',           objetivo: { accion: 'pescar', cantidad: 100 },   recompensa: { money: 10000, exp: 500, titulo: 'Pescador Experto' } },
        { id: 'a_cazar_100',   tipo: 'achievement', nombre: '🏹 Cazador Experto',    descripcion: 'Cazar 100 veces',            objetivo: { accion: 'cazar', cantidad: 100 },    recompensa: { money: 10000, exp: 500, titulo: 'Cazador Experto' } },
        { id: 'a_nivel_20',    tipo: 'achievement', nombre: '📈 Veterano',           descripcion: 'Alcanzar nivel 20',          objetivo: { accion: 'nivel', cantidad: 20 },     recompensa: { money: 20000, exp: 1000, titulo: 'Veterano' } },
        { id: 'a_nivel_50',    tipo: 'achievement', nombre: '📈 Leyenda',            descripcion: 'Alcanzar nivel 50',          objetivo: { accion: 'nivel', cantidad: 50 },     recompensa: { money: 50000, exp: 2500, titulo: 'Leyenda' } },
        { id: 'a_diamante_10', tipo: 'achievement', nombre: '💎 Diamantes para Siempre', descripcion: 'Encontrar 10 diamantes', objetivo: { accion: 'encontrar', item: 'diamante', cantidad: 10 }, recompensa: { money: 25000, exp: 1000, titulo: 'Coleccionista de Diamantes' } },
        { id: 'a_kraken_1',    tipo: 'achievement', nombre: '🐉 Cazador de Kraken',  descripcion: 'Pescar 1 Kraken',            objetivo: { accion: 'encontrar', item: 'kraken', cantidad: 1 }, recompensa: { money: 50000, exp: 2000, titulo: 'Cazador de Kraken' } },
        { id: 'a_dragon_1',    tipo: 'achievement', nombre: '🐲 Matadragones',       descripcion: 'Cazar 1 Dragón',             objetivo: { accion: 'encontrar', item: 'dragon', cantidad: 1 }, recompensa: { money: 50000, exp: 2000, titulo: 'Matadragones' } },
        { id: 'a_fenix_1',     tipo: 'achievement', nombre: '🔥 Cazador de Fénix',   descripcion: 'Cazar 1 Fénix',              objetivo: { accion: 'encontrar', item: 'fenix', cantidad: 1 }, recompensa: { money: 100000, exp: 5000, titulo: 'Cazador de Fénix' } },
        { id: 'a_rico_100k',   tipo: 'achievement', nombre: '💰 Millonario',         descripcion: 'Tener $100,000',             objetivo: { accion: 'dinero', cantidad: 100000 }, recompensa: { money: 50000, exp: 2000, titulo: 'Millonario' } },
        { id: 'a_craftear_50', tipo: 'achievement', nombre: '🔨 Maestro Artesano',   descripcion: 'Craftear 50 items',          objetivo: { accion: 'craftear', cantidad: 50 },   recompensa: { money: 30000, exp: 1500, titulo: 'Maestro Artesano' } },
        { id: 'a_completar_50',tipo: 'achievement', nombre: '🏆 Completista',        descripcion: 'Completar 50 misiones',      objetivo: { accion: 'completar_misiones', cantidad: 50 }, recompensa: { money: 50000, exp: 3000, titulo: 'Completista' } },
    ]
}

// ── Obtener misiones activas del usuario ───────────────────────
export function getActiveMissions(username) {
    const user = getOrCreateUser(username)
    return user.missions || { daily: [], weekly: [], achievement: [], lastReset: null }
}

// ── Generar misiones diarias nuevas ────────────────────────────
export function generateDailyMissions(username) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    // Verificar si ya se resetearon hoy
    const now = new Date()
    const lastReset = missions.lastReset ? new Date(missions.lastReset) : null

    if (lastReset && lastReset.toDateString() === now.toDateString()) {
        return missions.daily
    }

    // Seleccionar 3 misiones diarias aleatorias
    const pool = [...MISIONES_POOL.daily]
    const selected = []
    for (let i = 0; i < 3 && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        selected.push({ ...pool[idx], progress: 0, completed: false, claimed: false })
        pool.splice(idx, 1)
    }

    missions.daily = selected
    missions.lastReset = now.toISOString()
    updateUser(username, { missions })

    return selected
}

// ── Generar misiones semanales nuevas ──────────────────────────
export function generateWeeklyMissions(username) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    const now = new Date()
    const lastWeekly = missions.lastWeeklyReset ? new Date(missions.lastWeeklyReset) : null
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    if (lastWeekly && lastWeekly > weekAgo) {
        return missions.weekly
    }

    // Seleccionar 2 misiones semanales
    const pool = [...MISIONES_POOL.weekly]
    const selected = []
    for (let i = 0; i < 2 && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length)
        selected.push({ ...pool[idx], progress: 0, completed: false, claimed: false })
        pool.splice(idx, 1)
    }

    missions.weekly = selected
    missions.lastWeeklyReset = now.toISOString()
    updateUser(username, { missions })

    return selected
}

// ── Inicializar logros ─────────────────────────────────────────
export function initAchievements(username) {
    const missions = getActiveMissions(username)

    if (!missions.achievement || missions.achievement.length === 0) {
        missions.achievement = MISIONES_POOL.achievement.map(m => ({
            ...m, progress: 0, completed: false, claimed: false
        }))
        updateUser(username, { missions })
    }

    return missions.achievement
}

// ── Actualizar progreso de misiones ────────────────────────────
export function updateMissionProgress(username, accion, cantidad = 1, itemId = null) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)
    let updated = false

    const checkMission = (mission) => {
        if (mission.completed || mission.claimed) return mission

        const obj = mission.objetivo
        let shouldProgress = false

        if (obj.accion === accion) {
            if (obj.item && itemId) {
                if (obj.item === itemId) shouldProgress = true
            } else if (!obj.item) {
                shouldProgress = true
            }
        }

        if (shouldProgress) {
            mission.progress += cantidad
            if (mission.progress >= obj.cantidad) {
                mission.completed = true
            }
            updated = true
        }

        return mission
    }

    missions.daily = missions.daily.map(checkMission)
    missions.weekly = missions.weekly.map(checkMission)
    missions.achievement = missions.achievement.map(checkMission)

    if (updated) {
        updateUser(username, { missions })
    }

    return missions
}

// ── Reclamar recompensa de misión ──────────────────────────────
export function claimMissionReward(username, missionId) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    let mission = null
    let tipo = null

    // Buscar en daily
    const dailyIdx = missions.daily.findIndex(m => m.id === missionId)
    if (dailyIdx !== -1) { mission = missions.daily[dailyIdx]; tipo = 'daily' }

    // Buscar en weekly
    if (!mission) {
        const weeklyIdx = missions.weekly.findIndex(m => m.id === missionId)
        if (weeklyIdx !== -1) { mission = missions.weekly[weeklyIdx]; tipo = 'weekly' }
    }

    // Buscar en achievement
    if (!mission) {
        const achIdx = missions.achievement.findIndex(m => m.id === missionId)
        if (achIdx !== -1) { mission = missions.achievement[achIdx]; tipo = 'achievement' }
    }

    if (!mission) return { success: false, error: 'Misión no encontrada' }
    if (!mission.completed) return { success: false, error: 'Misión no completada' }
    if (mission.claimed) return { success: false, error: 'Recompensa ya reclamada' }

    // Dar recompensas
    const recompensa = mission.recompensa
    let newMoney = user.money || 0
    let expResult = null
    let itemGiven = null

    if (recompensa.money) {
        newMoney += recompensa.money
    }

    if (recompensa.exp) {
        expResult = addExp(username, recompensa.exp)
    }

    if (recompensa.item) {
        addItem(username, recompensa.item, 1)
        itemGiven = recompensa.item
    }

    if (recompensa.titulo) {
        const titulos = user.titulos || []
        if (!titulos.includes(recompensa.titulo)) {
            titulos.push(recompensa.titulo)
            updateUser(username, { titulos })
        }
    }

    // Marcar como reclamada
    mission.claimed = true
    updateUser(username, { money: newMoney, missions })

    return {
        success: true,
        mission,
        recompensa: {
            money: recompensa.money,
            exp: recompensa.exp,
            item: itemGiven,
            titulo: recompensa.titulo
        },
        expResult,
        newMoney
    }
}

// ── Formatear misiones para display ────────────────────────────
export function formatMissions(username) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    // Asegurar que estén inicializadas
    generateDailyMissions(username)
    generateWeeklyMissions(username)
    initAchievements(username)

    const freshMissions = getActiveMissions(username)

    let txt = `📋 *MISIONES DE ${user.profile?.displayName || user.username}*

`

    // Diarias
    txt += `📅 *MISIONES DIARIAS*
`
    const completadasDaily = freshMissions.daily.filter(m => m.claimed).length
    txt += `✅ ${completadasDaily}/${freshMissions.daily.length} completadas

`

    for (const m of freshMissions.daily) {
        const status = m.claimed ? '✅' : m.completed ? '💰' : '⏳'
        const bar = progressBar(m.progress, m.objetivo.cantidad)
        txt += `${status} *${m.nombre}*
`
        txt += `   ${m.descripcion}
`
        txt += `   ${bar} ${m.progress}/${m.objetivo.cantidad}
`
        txt += `   💰 $${m.recompensa.money.toLocaleString()} | ✨ ${m.recompensa.exp} EXP

`
    }

    // Semanales
    txt += `📆 *MISIONES SEMANALES*
`
    const completadasWeekly = freshMissions.weekly.filter(m => m.claimed).length
    txt += `✅ ${completadasWeekly}/${freshMissions.weekly.length} completadas

`

    for (const m of freshMissions.weekly) {
        const status = m.claimed ? '✅' : m.completed ? '💰' : '⏳'
        const bar = progressBar(m.progress, m.objetivo.cantidad)
        txt += `${status} *${m.nombre}*
`
        txt += `   ${m.descripcion}
`
        txt += `   ${bar} ${m.progress}/${m.objetivo.cantidad}
`
        txt += `   💰 $${m.recompensa.money.toLocaleString()} | ✨ ${m.recompensa.exp} EXP`
        if (m.recompensa.item) txt += ` | 🎁 ${m.recompensa.item}`
        txt += `

`
    }

    // Logros
    const completadosAch = freshMissions.achievement.filter(m => m.claimed).length
    txt += `🏆 *LOGROS* (${completadosAch}/${freshMissions.achievement.length})

`

    // Solo mostrar logros completados o cercanos (progreso > 0)
    const relevantes = freshMissions.achievement.filter(m => m.progress > 0 || m.claimed)
    for (const m of relevantes.slice(0, 5)) {
        const status = m.claimed ? '✅' : m.completed ? '💰' : '⏳'
        const bar = progressBar(m.progress, m.objetivo.cantidad)
        txt += `${status} *${m.nombre}*
`
        txt += `   ${bar} ${m.progress}/${m.objetivo.cantidad}
`
        if (m.recompensa.titulo) txt += `   🏅 Título: ${m.recompensa.titulo}
`
        txt += `
`
    }

    if (relevantes.length === 0) {
        txt += `📭 Aún no has progresado en ningún logro.
`
        txt += `¡Usa #minar, #pescar, #cazar para empezar!
`
    }

    return txt
}

// ── Barra de progreso helper ───────────────────────────────────
function progressBar(current, total) {
    const pct = Math.min(current / total, 1)
    const filled = Math.round(pct * 10)
    const empty = 10 - filled
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
}
