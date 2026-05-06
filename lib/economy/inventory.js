// lib/economy/inventory.js
// ════════════════════════════════════════════════════════════════
// SISTEMA DE INVENTARIO CON EQUIPAMIENTO Y DURABILIDAD
// ════════════════════════════════════════════════════════════════
import { getOrCreateUser, updateUser } from '../users.js'
import { getItem, RECETAS_CRAFTEO } from './items.js'

// ── Obtener inventario de usuario ──────────────────────────────
export function getInventory(username) {
    const user = getOrCreateUser(username)
    return user.inventory || {}
}

// ── Agregar item al inventario ─────────────────────────────────
export function addItem(username, itemId, cantidad = 1) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId]) {
        inventory[itemId] = { cantidad: 0, equipado: false, durabilidad: null }
    }

    inventory[itemId].cantidad += cantidad

    // Si es herramienta/armadura, setear durabilidad inicial
    const item = getItem(itemId)
    if (item && item.bonus && item.bonus.durabilidad && !inventory[itemId].durabilidad) {
        inventory[itemId].durabilidad = item.bonus.durabilidad
    }

    updateUser(username, { inventory })
    return inventory[itemId]
}

// ── Remover item del inventario ────────────────────────────────
export function removeItem(username, itemId, cantidad = 1) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId] || inventory[itemId].cantidad < cantidad) {
        return { success: false, error: 'No tienes suficientes items' }
    }

    inventory[itemId].cantidad -= cantidad

    if (inventory[itemId].cantidad <= 0) {
        // Desequipar si estaba equipado
        if (inventory[itemId].equipado) {
            unequipItem(username, itemId)
        }
        delete inventory[itemId]
    }

    updateUser(username, { inventory })
    return { success: true, inventory }
}

// ── Equipar item ───────────────────────────────────────────────
export function equipItem(username, itemId) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId] || inventory[itemId].cantidad < 1) {
        return { success: false, error: 'No tienes este item' }
    }

    const item = getItem(itemId)
    if (!item || !item.tipo || !['herramienta', 'arma', 'armadura', 'accesorio'].includes(item.tipo)) {
        return { success: false, error: 'Este item no se puede equipar' }
    }

    // Desequipar item del mismo tipo si hay uno equipado
    const equipado = getEquippedItems(username)
    const sameType = Object.entries(equipado).find(([_, data]) => {
        const it = getItem(data.id)
        return it && it.tipo === item.tipo
    })

    if (sameType) {
        inventory[sameType[0]].equipado = false
    }

    inventory[itemId].equipado = true
    updateUser(username, { inventory })

    return { success: true, item, previous: sameType ? sameType[0] : null }
}

// ── Desequipar item ────────────────────────────────────────────
export function unequipItem(username, itemId) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (inventory[itemId]) {
        inventory[itemId].equipado = false
        updateUser(username, { inventory })
    }

    return { success: true }
}

// ── Obtener items equipados ────────────────────────────────────
export function getEquippedItems(username) {
    const inventory = getInventory(username)
    const equipped = {}

    for (const [id, data] of Object.entries(inventory)) {
        if (data.equipado) {
            equipped[id] = { ...data, id }
        }
    }

    return equipped
}

// ── Calcular bonus totales de equipamiento ─────────────────────
export function getEquipmentBonus(username) {
    const equipped = getEquippedItems(username)
    const bonuses = {
        mineria: 1.0,
        pesca: 1.0,
        caza: 1.0,
        luck: 1.0,
        exp_bonus: 1.0,
        defensa: 0,
        daño: 0,
        charisma: 0
    }

    for (const [id, data] of Object.entries(equipped)) {
        const item = getItem(id)
        if (item && item.bonus) {
            for (const [key, value] of Object.entries(item.bonus)) {
                if (key === 'durabilidad') continue
                if (typeof value === 'number' && typeof bonuses[key] === 'number') {
                    if (key === 'defensa' || key === 'daño' || key === 'charisma') {
                        bonuses[key] += value
                    } else {
                        bonuses[key] *= value
                    }
                }
            }
        }
    }

    return bonuses
}

// ── Usar durabilidad de herramienta ────────────────────────────
export function useDurability(username, itemId, amount = 1) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId] || !inventory[itemId].equipado) {
        return { success: false, broken: false }
    }

    inventory[itemId].durabilidad -= amount

    if (inventory[itemId].durabilidad <= 0) {
        inventory[itemId].cantidad -= 1
        inventory[itemId].equipado = false
        inventory[itemId].durabilidad = null

        if (inventory[itemId].cantidad <= 0) {
            delete inventory[itemId]
        }

        updateUser(username, { inventory })
        return { success: true, broken: true }
    }

    updateUser(username, { inventory })
    return { success: true, broken: false, remaining: inventory[itemId].durabilidad }
}

// ── Verificar si tiene materiales para craftear ────────────────
export function canCraft(username, recipeId) {
    const user = getOrCreateUser(username)
    const inventory = user.inventory || {}
    const recipe = RECETAS_CRAFTEO[recipeId]

    if (!recipe) return { can: false, error: 'Receta no encontrada' }

    const missing = []
    for (const [materialId, required] of Object.entries(recipe.requiere)) {
        const have = inventory[materialId]?.cantidad || 0
        if (have < required) {
            missing.push({ item: materialId, need: required, have })
        }
    }

    if (missing.length > 0) {
        return { can: false, missing, error: 'Materiales insuficientes' }
    }

    return { can: true, recipe }
}

// ── Craftear item ──────────────────────────────────────────────
export function craftItem(username, recipeId) {
    const check = canCraft(username, recipeId)
    if (!check.can) return { success: false, ...check }

    const recipe = check.recipe

    // Consumir materiales
    for (const [materialId, required] of Object.entries(recipe.requiere)) {
        removeItem(username, materialId, required)
    }

    // Dar item crafteado
    addItem(username, recipeId, 1)

    return { 
        success: true, 
        item: recipe, 
        consumed: recipe.requiere 
    }
}

// ── Vender item ────────────────────────────────────────────────
export function sellItem(username, itemId, cantidad = 1) {
    const item = getItem(itemId)
    if (!item) return { success: false, error: 'Item no existe' }

    const user = getOrCreateUser(username)
    const inventory = user.inventory || {}

    if (!inventory[itemId] || inventory[itemId].cantidad < cantidad) {
        return { success: false, error: 'No tienes suficientes items' }
    }

    // No vender items equipados
    if (inventory[itemId].equipado && inventory[itemId].cantidad <= cantidad) {
        return { success: false, error: 'Desequipa el item primero' }
    }

    const valor = (item.valor || item.precio_venta || 1) * cantidad

    removeItem(username, itemId, cantidad)

    const newMoney = (user.money || 0) + valor
    updateUser(username, { money: newMoney })

    return { success: true, valor, newMoney }
}

// ── Formatear inventario para display ──────────────────────────
export function formatInventory(username) {
    const user = getOrCreateUser(username)
    const inventory = user.inventory || {}
    const equipped = getEquippedItems(username)

    let txt = `🎒 *INVENTARIO DE ${user.profile?.displayName || user.username}*

`

    // Items equipados
    const equipadosList = Object.values(equipped)
    if (equipadosList.length > 0) {
        txt += `⚔️ *EQUIPADO:*
`
        for (const data of equipadosList) {
            const item = getItem(data.id)
            const durabilidad = data.durabilidad ? ` [${data.durabilidad} usos]` : ''
            txt += `  ${item?.emoji || '•'} ${item?.nombre || data.id}${durabilidad}
`
        }
        txt += `
`
    }

    // Items por categoría
    const categorias = {
        herramienta: '🔧 Herramientas',
        arma: '⚔️ Armas',
        armadura: '🛡️ Armaduras',
        accesorio: '💍 Accesorios',
        consumible: '🧪 Consumibles',
        mineral: '⛏️ Minerales',
        pez: '🐟 Peces',
        animal: '🏹 Caza',
        material: '🌿 Materiales'
    }

    const porCategoria = {}
    for (const [id, data] of Object.entries(inventory)) {
        if (data.equipado) continue
        const item = getItem(id)
        if (!item) continue

        const cat = item.tipo || 'material'
        if (!porCategoria[cat]) porCategoria[cat] = []
        porCategoria[cat].push({ id, ...data, item })
    }

    for (const [cat, items] of Object.entries(porCategoria)) {
        if (items.length === 0) continue
        txt += `${categorias[cat] || cat}:
`
        for (const data of items) {
            const durabilidad = data.durabilidad ? ` [${data.durabilidad}]` : ''
            txt += `  ${data.item.emoji} ${data.item.nombre} x${data.cantidad}${durabilidad}
`
        }
        txt += `
`
    }

    if (Object.keys(inventory).length === 0) {
        txt += `📭 Tu inventario está vacío.
`
        txt += `Usa #minar, #pescar, #cazar o #recolectar para obtener items.`
    }

    return txt
}
