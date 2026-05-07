import { getOrCreateUser, updateUser } from '../users.js'

export const RANGOS = [
    { nivel: 1,   nombre: 'Novato',           emoji: '🌱', color: '#888888' },
    { nivel: 5,   nombre: 'Aprendiz',         emoji: '🌿', color: '#55AA55' },
    { nivel: 10,  nombre: 'Aventurero',       emoji: '🍃', color: '#55FF55' },
    { nivel: 15,  nombre: 'Explorador',       emoji: '🌳', color: '#55AAFF' },
    { nivel: 20,  nombre: 'Cazador',          emoji: '🏹', color: '#5555FF' },
    { nivel: 25,  nombre: 'Guerrero',         emoji: '⚔️', color: '#AA55FF' },
    { nivel: 30,  nombre: 'Veterano',         emoji: '🛡️', color: '#FF55FF' },
    { nivel: 35,  nombre: 'Elite',            emoji: '👑', color: '#FFAA55' },
    { nivel: 40,  nombre: 'Campeon',          emoji: '⭐', color: '#FFAA00' },
    { nivel: 50,  nombre: 'Leyenda',          emoji: '🔥', color: '#FF5555' },
    { nivel: 60,  nombre: 'Semidios',         emoji: '⚡', color: '#FF0000' },
    { nivel: 75,  nombre: 'Dios',             emoji: '👁️', color: '#AA0000' },
    { nivel: 99,  nombre: 'Inmortal',         emoji: '💀', color: '#FFFFFF' },
    { nivel: 100, nombre: 'Creador',          emoji: '🌌', color: '#FFD700' },
]

export function getRango(level) {
    let rango = RANGOS[0]
    for (const r of RANGOS) {
        if (level >= r.nivel) rango = r
    }
    return rango
}

export function updateStats(username, actividad, data = {}) {
    const user = getOrCreateUser(username)
    const stats = user.stats || {
        minar: { count: 0, items: {}, best: null },
        pescar: { count: 0, items: {}, best: null },
        cazar: { count: 0, items: {}, best: null },
        recolectar: { count: 0, items: {}, best: null },
        trabajar: { count: 0, totalEarned: 0 },
        craftear: { count: 0, items: {} },
        vender: { count: 0, totalEarned: 0 },
        combate: { wins: 0, losses: 0, totalDamage: 0 },
    }

    if (!stats[actividad]) stats[actividad] = { count: 0 }
    stats[actividad].count += 1

    if (data.item) {
        const itemName = data.item.id || data.item
        if (!stats[actividad].items) stats[actividad].items = {}
        if (!stats[actividad].items[itemName]) stats[actividad].items[itemName] = 0
        stats[actividad].items[itemName] += data.cantidad || 1

        const itemValue = data.item.valor || 0
        if (!stats[actividad].best || itemValue > (stats[actividad].best.valor || 0)) {
            stats[actividad].best = data.item
        }
    }

    if (data.money) {
        if (!stats[actividad].totalEarned) stats[actividad].totalEarned = 0
        stats[actividad].totalEarned += data.money
    }

    if (data.damage) {
        if (!stats[actividad].totalDamage) stats[actividad].totalDamage = 0
        stats[actividad].totalDamage += data.damage
    }

    if (data.result === 'win') stats[actividad].wins = (stats[actividad].wins || 0) + 1
    if (data.result === 'loss') stats[actividad].losses = (stats[actividad].losses || 0) + 1

    updateUser(username, { stats })
    return stats
}

export function getFormattedStats(username) {
    const user = getOrCreateUser(username)
    const stats = user.stats || {}
    const rango = getRango(user.level || 1)

    let txt = `📊 *ESTADISTICAS DE ${user.profile?.displayName || user.username}*

`

    txt += `${rango.emoji} *Rango:* ${rango.nombre}
`
    txt += `📈 *Nivel:* ${user.level || 1}
`
    txt += `✨ *EXP:* ${user.exp || 0}/${(user.level || 1) * 150}
`
    txt += `💰 *Dinero:* $${(user.money || 0).toLocaleString()}
`
    txt += `🏦 *Banco:* $${(user.bank || 0).toLocaleString()}

`

    txt += `⚡ *ACTIVIDADES*
`
    txt += `⛏️ Minar: ${stats.minar?.count || 0} veces
`
    txt += `🎣 Pescar: ${stats.pescar?.count || 0} veces
`
    txt += `🏹 Cazar: ${stats.cazar?.count || 0} veces
`
    txt += `🌿 Recolectar: ${stats.recolectar?.count || 0} veces
`
    txt += `💼 Trabajar: ${stats.trabajar?.count || 0} veces
`
    txt += `🔨 Craftear: ${stats.craftear?.count || 0} veces
`
    txt += `💵 Vender: ${stats.vender?.count || 0} veces

`

    txt += `🏆 *MEJORES HALLAZGOS*
`
    if (stats.minar?.best) txt += `⛏️ ${stats.minar.best.emoji || ''} ${stats.minar.best.nombre || stats.minar.best}
`
    if (stats.pescar?.best) txt += `🎣 ${stats.pescar.best.emoji || ''} ${stats.pescar.best.nombre || stats.pescar.best}
`
    if (stats.cazar?.best) txt += `🏹 ${stats.cazar.best.emoji || ''} ${stats.cazar.best.nombre || stats.cazar.best}
`

    if (!stats.minar?.best && !stats.pescar?.best && !stats.cazar?.best) {
        txt += `📭 Aun no has encontrado nada especial...
`
    }

    if (user.titulos && user.titulos.length > 0) {
        txt += `
🏅 *TITULOS:* ${user.titulos.join(', ')}
`
    }

    return txt
}

export function getRangoBonus(level) {
    const bonus = {
        exp: 1.0,
        money: 1.0,
        luck: 1.0,
    }

    bonus.exp = 1 + (level * 0.01)
    bonus.money = 1 + (level * 0.005)
    bonus.luck = 1 + (level * 0.008)

    return bonus
}
