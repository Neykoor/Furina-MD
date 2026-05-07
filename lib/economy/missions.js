import { getOrCreateUser, updateUser, addExp } from '../users.js'
import { addItem } from './inventory.js'

export const MISIONES_POOL = {
    daily: [
        { id: 'd_minar_5',     tipo: 'daily', nombre: 'Minero Novato',      descripcion: 'Minar 5 veces',              objetivo: { accion: 'minar', cantidad: 5 },      recompensa: { money: 500, exp: 30 } },
        { id: 'd_pescar_3',    tipo: 'daily', nombre: 'Pescador Casual',    descripcion: 'Pescar 3 veces',             objetivo: { accion: 'pescar', cantidad: 3 },     recompensa: { money: 400, exp: 25 } },
        { id: 'd_cazar_2',     tipo: 'daily', nombre: 'Cazador Principiante',descripcion: 'Cazar 2 veces',             objetivo: { accion: 'cazar', cantidad: 2 },      recompensa: { money: 600, exp: 35 } },
        { id: 'd_trabajar_3',  tipo: 'daily', nombre: 'Empleado del Dia',   descripcion: 'Trabajar 3 veces',           objetivo: { accion: 'trabajar', cantidad: 3 },   recompensa: { money: 800, exp: 40 } },
        { id: 'd_vender_5',    tipo: 'daily', nombre: 'Vendedor Ambulante', descripcion: 'Vender 5 items',             objetivo: { accion: 'vender', cantidad: 5 },    recompensa: { money: 300, exp: 20 } },
        { id: 'd_craftear_1',  tipo: 'daily', nombre: 'Artesano',           descripcion: 'Craftear 1 item',            objetivo: { accion: 'craftear', cantidad: 1 },   recompensa: { money: 700, exp: 50 } },
        { id: 'd_oro_1',       tipo: 'daily', nombre: 'Buscador de Oro',    descripcion: 'Encontrar 1 oro al minar',   objetivo: { accion: 'encontrar', item: 'oro', cantidad: 1 }, recompensa: { money: 1000, exp: 60 } },
        { id: 'd_pescar_raro', tipo: 'daily', nombre: 'Pesca Epica',        descripcion: 'Pescar 1 pez raro+',         objetivo: { accion: 'pescar_raro', cantidad: 1 }, recompensa: { money: 800, exp: 45 } },
        { id: 'd_cazar_lobo',  tipo: 'daily', nombre: 'Cazador de Lobos',   descripcion: 'Cazar 1 lobo',               objetivo: { accion: 'cazar_especifico', item: 'lobo', cantidad: 1 }, recompensa: { money: 900, exp: 50 } },
        { id: 'd_recolectar_10',tipo:'daily', nombre: 'Recolector',         descripcion: 'Recolectar 10 veces',        objetivo: { accion: 'recolectar', cantidad: 10 }, recompensa: { money: 350, exp: 25 } },
    ],
    weekly: [
        { id: 'w_minar_30',    tipo: 'weekly', nombre: 'Maestro Minero',     descripcion: 'Minar 30 veces',             objetivo: { accion: 'minar', cantidad: 30 },     recompensa: { money: 5000, exp: 200, item: 'pico_hierro' } },
        { id: 'w_pescar_20',   tipo: 'weekly', nombre: 'Rey de la Pesca',    descripcion: 'Pescar 20 veces',            objetivo: { accion: 'pescar', cantidad: 20 },    recompensa: { money: 4000, exp: 180, item: 'cana_oro' } },
        { id: 'w_cazar_15',    tipo: 'weekly', nombre: 'Gran Cazador',       descripcion: 'Cazar 15 veces',             objetivo: { accion: 'cazar', cantidad: 15 },     recompensa: { money: 6000, exp: 250, item: 'arco_hierro' } },
        { id: 'w_diamante_3',  tipo: 'weekly', nombre: 'Coleccionista',      descripcion: 'Encontrar 3 diamantes',      objetivo: { accion: 'encontrar', item: 'diamante', cantidad: 3 }, recompensa: { money: 10000, exp: 400, item: 'pico_oro' } },
        { id: 'w_legendario_1',tipo: 'weekly', nombre: 'Cazador Legendario', descripcion: 'Encontrar 1 item legendario',objetivo: { accion: 'encontrar_legendario', cantidad: 1 }, recompensa: { money: 15000, exp: 500, item: 'espada_diamante' } },
        { id: 'w_craftear_10', tipo: 'weekly', nombre: 'Maestro Artesano',   descripcion: 'Craftear 10 items',          objetivo: { accion: 'craftear', cantidad: 10 },   recompensa: { money: 8000, exp: 300, item: 'amuleto_esmeralda' } },
        { id: 'w_money_50k',   tipo: 'weekly', nombre: 'Magnate',            descripcion: 'Ganar $50,000 en total',     objetivo: { accion: 'ganar_dinero', cantidad: 50000 }, recompensa: { money: 10000, exp: 350, item: 'anillo_oro' } },
        { id: 'w_todos_10',    tipo: 'weekly', nombre: 'Aventurero Completo', descripcion: 'Hacer 10 de cada actividad', objetivo: { accion: 'mixto', minar: 10, pescar: 10, cazar: 10, recolectar: 10 }, recompensa: { money: 12000, exp: 450, item: 'corona_diamante' } },
    ],
    achievement: [
        { id: 'a_minar_100',   tipo: 'achievement', nombre: 'Minero Veterano',    descripcion: 'Minar 100 veces',            objetivo: { accion: 'minar', cantidad: 100 },    recompensa: { money: 10000, exp: 500, titulo: 'Minero Veterano' } },
        { id: 'a_pescar_100',  tipo: 'achievement', nombre: 'Pescador Experto',   descripcion: 'Pescar 100 veces',           objetivo: { accion: 'pescar', cantidad: 100 },   recompensa: { money: 10000, exp: 500, titulo: 'Pescador Experto' } },
        { id: 'a_cazar_100',   tipo: 'achievement', nombre: 'Cazador Experto',    descripcion: 'Cazar 100 veces',            objetivo: { accion: 'cazar', cantidad: 100 },    recompensa: { money: 10000, exp: 500, titulo: 'Cazador Experto' } },
        { id: 'a_nivel_20',    tipo: 'achievement', nombre: 'Veterano',           descripcion: 'Alcanzar nivel 20',          objetivo: { accion: 'nivel', cantidad: 20 },     recompensa: { money: 20000, exp: 1000, titulo: 'Veterano' } },
        { id: 'a_nivel_50',    tipo: 'achievement', nombre: 'Leyenda',            descripcion: 'Alcanzar nivel 50',          objetivo: { accion: 'nivel', cantidad: 50 },     recompensa: { money: 50000, exp: 2500, titulo: 'Leyenda' } },
        { id: 'a_diamante_10', tipo: 'achievement', nombre: 'Diamantes para Siempre', descripcion: 'Encontrar 10 diamantes', objetivo: { accion: 'encontrar', item: 'diamante', cantidad: 10 }, recompensa: { money: 25000, exp: 1000, titulo: 'Coleccionista de Diamantes' } },
        { id: 'a_kraken_1',    tipo: 'achievement', nombre: 'Cazador de Kraken',  descripcion: 'Pescar 1 Kraken',            objetivo: { accion: 'encontrar', item: 'kraken', cantidad: 1 }, recompensa: { money: 50000, exp: 2000, titulo: 'Cazador de Kraken' } },
        { id: 'a_dragon_1',    tipo: 'achievement', nombre: 'Matadragones',       descripcion: 'Cazar 1 Dragon',             objetivo: { accion: 'encontrar', item: 'dragon', cantidad: 1 }, recompensa: { money: 50000, exp: 2000, titulo: 'Matadragones' } },
        { id: 'a_fenix_1',     tipo: 'achievement', nombre: 'Cazador de Fenix',   descripcion: 'Cazar 1 Fenix',              objetivo: { accion: 'encontrar', item: 'fenix', cantidad: 1 }, recompensa: { money: 100000, exp: 5000, titulo: 'Cazador de Fenix' } },
        { id: 'a_rico_100k',   tipo: 'achievement', nombre: 'Millonario',         descripcion: 'Tener $100,000',             objetivo: { accion: 'dinero', cantidad: 100000 }, recompensa: { money: 50000, exp: 2000, titulo: 'Millonario' } },
        { id: 'a_craftear_50', tipo: 'achievement', nombre: 'Maestro Artesano',   descripcion: 'Craftear 50 items',          objetivo: { accion: 'craftear', cantidad: 50 },   recompensa: { money: 30000, exp: 1500, titulo: 'Maestro Artesano' } },
        { id: 'a_completar_50',tipo: 'achievement', nombre: 'Completista',        descripcion: 'Completar 50 misiones',      objetivo: { accion: 'completar_misiones', cantidad: 50 }, recompensa: { money: 50000, exp: 3000, titulo: 'Completista' } },
    ]
}

export function getActiveMissions(username) {
    const user = getOrCreateUser(username)
    return user.missions || { daily: [], weekly: [], achievement: [], lastReset: null }
}

export function generateDailyMissions(username) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    const now = new Date()
    const lastReset = missions.lastReset ? new Date(missions.lastReset) : null

    if (lastReset && lastReset.toDateString() === now.toDateString()) {
        return missions.daily
    }

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

export function generateWeeklyMissions(username) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    const now = new Date()
    const lastWeekly = missions.lastWeeklyReset ? new Date(missions.lastWeeklyReset) : null
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    if (lastWeekly && lastWeekly > weekAgo) {
        return missions.weekly
    }

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

export function claimMissionReward(username, missionId) {
    const user = getOrCreateUser(username)
    const missions = getActiveMissions(username)

    let mission = null
    let tipo = null

    const dailyIdx = missions.daily.findIndex(m => m.id === missionId)
    if (dailyIdx !== -1) { mission = missions.daily[dailyIdx]; tipo = 'daily' }

    if (!mission) {
        const weeklyIdx = missions.weekly.findIndex(m => m.id === missionId)
        if (weeklyIdx !== -1) { mission = missions.weekly[weeklyIdx]; tipo = 'weekly' }
    }

    if (!mission) {
        const achIdx = missions.achievement.findIndex(m => m.id === missionId)
        if (achIdx !== -1) { mission = missions.achievement[achIdx]; tipo = 'achievement' }
    }

    if (!mission) return { success: false, error: 'Mision no encontrada' }
    if (!mission.completed) return { success: false, error: 'Mision no completada' }
    if (mission.claimed) return { success: false, error: 'Recompensa ya reclamada' }

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

export function formatMissions(username) {
    const user = getOrCreateUser(username)

    generateDailyMissions(username)
    generateWeeklyMissions(username)
    initAchievements(username)

    const freshMissions = getActiveMissions(username)

    let txt = `📋 *MISIONES DE ${user.profile?.displayName || user.username}*

`

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

    const completadosAch = freshMissions.achievement.filter(m => m.claimed).length
    txt += `🏆 *LOGROS* (${completadosAch}/${freshMissions.achievement.length})

`

    const relevantes = freshMissions.achievement.filter(m => m.progress > 0 || m.claimed)
    for (const m of relevantes.slice(0, 5)) {
        const status = m.claimed ? '✅' : m.completed ? '💰' : '⏳'
        const bar = progressBar(m.progress, m.objetivo.cantidad)
        txt += `${status} *${m.nombre}*
`
        txt += `   ${bar} ${m.progress}/${m.objetivo.cantidad}
`
        if (m.recompensa.titulo) txt += `   🏅 Titulo: ${m.recompensa.titulo}
`
        txt += `
`
    }

    if (relevantes.length === 0) {
        txt += `📭 Aun no has progresado en ningun logro.
`
        txt += `¡Usa #minar, #pescar, #cazar para empezar!
`
    }

    return txt
}

function progressBar(current, total) {
    const pct = Math.min(current / total, 1)
    const filled = Math.round(pct * 10)
    const empty = 10 - filled
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
}
