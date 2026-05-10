import { getOrCreateUser, updateUser } from './users.js'

export function getFamilyData(userId) {
    const user = getOrCreateUser(userId)
    return user.family || {
        spouse: null,
        spouseSince: null,
        children: [],
        parents: [],
        adoptedBy: null,
        tree: {}
    }
}

export function updateFamily(userId, data) {
    const user = getOrCreateUser(userId)
    const family = { ...(user.family || {}), ...data }
    updateUser(userId, { family })
    return family
}

export function proposeMarriage(fromId, toId) {
    const fromFamily = getFamilyData(fromId)
    const toFamily = getFamilyData(toId)

    if (fromFamily.spouse) return { success: false, error: 'Ya estás casado' }
    if (toFamily.spouse) return { success: false, error: 'Esa persona ya está casada' }
    if (fromId === toId) return { success: false, error: 'No puedes casarte contigo mismo' }

    return { success: true, pending: toId }
}

export function acceptMarriage(fromId, toId) {
    const now = Date.now()

    updateFamily(fromId, {
        spouse: toId,
        spouseSince: now,
        children: [],
        parents: []
    })

    updateFamily(toId, {
        spouse: fromId,
        spouseSince: now,
        children: [],
        parents: []
    })

    return { success: true, married: true }
}

export function divorce(userId) {
    const family = getFamilyData(userId)
    if (!family.spouse) return { success: false, error: 'No estás casado' }

    const spouseId = family.spouse

    updateFamily(userId, { spouse: null, spouseSince: null })
    updateFamily(spouseId, { spouse: null, spouseSince: null })

    return { success: true, divorced: spouseId }
}

export function adoptChild(parentId, childId) {
    const parentFamily = getFamilyData(parentId)
    const childFamily = getFamilyData(childId)

    if (parentFamily.children.includes(childId)) {
        return { success: false, error: 'Ya es tu hijo' }
    }

    if (childFamily.parents.length >= 2) {
        return { success: false, error: 'Esa persona ya tiene 2 padres' }
    }

    if (childId === parentId) return { success: false, error: 'No puedes adoptarte a ti mismo' }
    if (childFamily.spouse === parentId) return { success: false, error: 'Tu esposo no puede ser tu hijo' }

    const newParentChildren = [...parentFamily.children, childId]
    const newChildParents = [...childFamily.parents, parentId]

    updateFamily(parentId, { children: newParentChildren })
    updateFamily(childId, { parents: newChildParents, adoptedBy: parentId })

    syncGrandparents(parentId, childId)

    return { success: true, adopted: childId }
}

function syncGrandparents(parentId, childId) {
    const parentFamily = getFamilyData(parentId)
    const childFamily = getFamilyData(childId)

    for (const grandparentId of parentFamily.parents) {
        const gpFamily = getFamilyData(grandparentId)
        if (!gpFamily.children.includes(parentId)) continue

        const grandchildExists = gpFamily.children.some(c => {
            const cFamily = getFamilyData(c)
            return cFamily.parents.includes(grandparentId) && c !== parentId
        })

        const newChildren = [...gpFamily.children]
        if (!newChildren.includes(childId)) {
            newChildren.push(childId)
            updateFamily(grandparentId, { children: newChildren })
        }
    }
}

export function removeChild(parentId, childId) {
    const parentFamily = getFamilyData(parentId)
    const childFamily = getFamilyData(childId)

    const filteredChildren = parentFamily.children.filter(c => c !== childId)
    const filteredParents = childFamily.parents.filter(p => p !== parentId)

    updateFamily(parentId, { children: filteredChildren })
    updateFamily(childId, { parents: filteredParents, adoptedBy: filteredParents[0] || null })

    return { success: true, removed: childId }
}

export function buildFamilyTree(userId, visited = new Set(), depth = 0, maxDepth = 4) {
    if (depth > maxDepth || visited.has(userId)) return null
    visited.add(userId)

    const user = getOrCreateUser(userId)
    const family = getFamilyData(userId)

    const node = {
        id: userId,
        name: user.profile?.displayName || user.username,
        emoji: getRelationEmoji(family, depth),
        spouse: family.spouse,
        children: [],
        parents: [],
        depth
    }

    for (const childId of family.children) {
        const childNode = buildFamilyTree(childId, new Set(visited), depth + 1, maxDepth)
        if (childNode) node.children.push(childNode)
    }

    for (const parentId of family.parents) {
        const parentNode = buildFamilyTree(parentId, new Set(visited), depth - 1, maxDepth)
        if (parentNode) node.parents.push(parentNode)
    }

    return node
}

function getRelationEmoji(family, depth) {
    if (family.spouse && depth === 0) return '💑'
    if (family.parents.length > 0 && depth > 0) return '👶'
    if (family.children.length > 0 && depth < 0) return '👴'
    return '👤'
}

export function getRelationLabel(viewerId, targetId) {
    const viewerFamily = getFamilyData(viewerId)
    const targetFamily = getFamilyData(targetId)

    if (viewerFamily.spouse === targetId) return 'Cónyuge'
    if (viewerFamily.children.includes(targetId)) return 'Hijo'
    if (viewerFamily.parents.includes(targetId)) return 'Padre'

    for (const childId of viewerFamily.children) {
        const childFamily = getFamilyData(childId)
        if (childFamily.children.includes(targetId)) return 'Nieto'
    }

    for (const parentId of viewerFamily.parents) {
        const parentFamily = getFamilyData(parentId)
        if (parentFamily.parents.includes(targetId)) return 'Abuelo'
    }

    if (viewerFamily.parents.some(p => {
        const pFamily = getFamilyData(p)
        return pFamily.children.includes(targetId) && targetId !== viewerId
    })) return 'Hermano'

    return 'Desconocido'
}

export function formatFamilyTree(tree, prefix = '', isLast = true, lines = []) {
    if (!tree) return lines

    const connector = prefix + (isLast ? '└── ' : '├── ')
    const spouseText = tree.spouse ? ` 💑 ${getUserName(tree.spouse)}` : ''
    lines.push(`${connector}${tree.emoji} ${tree.name}${spouseText}`)

    const newPrefix = prefix + (isLast ? '    ' : '│   ')

    const allRelatives = [...tree.children, ...tree.parents]
    for (let i = 0; i < allRelatives.length; i++) {
        formatFamilyTree(allRelatives[i], newPrefix, i === allRelatives.length - 1, lines)
    }

    return lines
}

function getUserName(userId) {
    const user = getOrCreateUser(userId)
    return user.profile?.displayName || user.username || userId
}

export function getFamilyStats(userId) {
    const family = getFamilyData(userId)
    const user = getOrCreateUser(userId)

    let generation = 1
    let tempId = userId
    while (getFamilyData(tempId).parents.length > 0) {
        generation++
        tempId = getFamilyData(tempId).parents[0]
    }

    const allDescendants = countDescendants(userId)
    const allAncestors = countAncestors(userId)

    return {
        generation,
        descendants: allDescendants,
        ancestors: allAncestors,
        spouse: family.spouse,
        childrenCount: family.children.length,
        parentsCount: family.parents.length,
        marriedSince: family.spouseSince
    }
}

function countDescendants(userId, visited = new Set()) {
    if (visited.has(userId)) return 0
    visited.add(userId)

    const family = getFamilyData(userId)
    let count = family.children.length

    for (const childId of family.children) {
        count += countDescendants(childId, new Set(visited))
    }

    return count
}

function countAncestors(userId, visited = new Set()) {
    if (visited.has(userId)) return 0
    visited.add(userId)

    const family = getFamilyData(userId)
    let count = family.parents.length

    for (const parentId of family.parents) {
        count += countAncestors(parentId, new Set(visited))
    }

    return count
}
