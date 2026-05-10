import { getOrCreateUser, updateUser } from '../users.js'
import { getItem, RECETAS_CRAFTEO } from './items.js'

export function getInventory(username) {
    const user = getOrCreateUser(username)
    return user.inventory || {}
}

export function addItem(username, itemId, cantidad = 1) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId]) {
        inventory[itemId] = { cantidad: 0, equipado: false, durabilidad: null }
    }

    inventory[itemId].cantidad += cantidad

    const item = getItem(itemId)
    if (item && item.bonus && item.bonus.durabilidad && !inventory[itemId].durabilidad) {
        inventory[itemId].durabilidad = item.bonus.durabilidad
    }

    updateUser(username, { inventory })
    return inventory[itemId]
}

export function removeItem(username, itemId, cantidad = 1) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (!inventory[itemId] || inventory[itemId].cantidad < cantidad) {
        return { success: false, error: 'No tienes suficientes items' }
    }

    inventory[itemId].cantidad -= cantidad

    if (inventory[itemId].cantidad <= 0) {
        if (inventory[itemId].equipado) {
            inventory[itemId].equipado = false
        }
        delete inventory[itemId]
    }

    updateUser(username, { inventory })
    return { success: true, inventory }
}

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

export function unequipItem(username, itemId) {
    const user = getOrCreateUser(username)
    const inventory = { ...(user.inventory || {}) }

    if (inventory[itemId]) {
        inventory[itemId].equipado = false
        updateUser(username, { inventory })
    }

    return { success: true }
}

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

export function getEquipmentBonus(username) {
    const equipped = getEquippedItems(username)
    const bonuses = {
        mineria: 1.0,
        pesca: 1.0,
        caza: 1.0,
        talar: 1.0,
        luck: 1.0,
        exp_bonus: 1.0,
        money: 1.0,
        defensa: 0,
        danio: 0,
        charisma: 0
    }

    for (const [id, data] of Object.entries(equipped)) {
        const item = getItem(id)
        if (item && item.bonus) {
            for (const [key, value] of Object.entries(item.bonus)) {
                if (key === 'durabilidad') continue
                if (typeof value === 'number' && typeof bonuses[key] === 'number') {
                    if (key === 'defensa' || key === 'danio' || key === 'charisma') {
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

export function craftItem(username, recipeId) {
    const check = canCraft(username, recipeId)
    if (!check.can) return { success: false, ...check }

    const recipe = check.recipe

    for (const [materialId, required] of Object.entries(recipe.requiere)) {
        removeItem(username, materialId, required)
    }

    addItem(username, recipeId, 1)

    return { success: true, item: recipe, consumed: recipe.requiere }
}

export function sellItem(username, itemId, cantidad = 1) {
    const item = getItem(itemId)
    if (!item) return { success: false, error: 'Item no existe' }

    const user = getOrCreateUser(username)
    const inventory = user.inventory || {}

    if (!inventory[itemId] || inventory[itemId].cantidad < cantidad) {
        return { success: false, error: 'No tienes suficientes items' }
    }

    if (inventory[itemId].equipado && inventory[itemId].cantidad <= cantidad) {
        return { success: false, error: 'Desequipa el item primero' }
    }

    const valor = (item.precio_venta || item.valor || 1) * cantidad

    const removeResult = removeItem(username, itemId, cantidad)
    if (!removeResult.success) return removeResult

    const newMoney = (user.money || 0) + valor
    updateUser(username, { money: newMoney })

    return { success: true, valor, newMoney }
}
