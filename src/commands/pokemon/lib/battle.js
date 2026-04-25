 /**
 * Sistema de Batallas PvP - V5.4 (Fórmula de daño balanceada)
 */

import { Pokemon } from './pokemon.js'
import { getTypeMultiplier } from './typeChart.js'

const activeBattles = new Map()
const battleRequests = new Map()
const battleCooldowns = new Map()
const battleTimeouts = new Map()

const BATTLE_COOLDOWN = 5 * 60 * 1000
const INACTIVITY_TIMEOUT = 3 * 60 * 1000
const MAX_ACTIVE_BATTLES = 50
const MAX_PENDING_REQUESTS = 30
const MOVE_POWER = 60

const setBattleTimeout = (battleId) => {
    if (battleTimeouts.has(battleId)) clearTimeout(battleTimeouts.get(battleId))
    const timeout = setTimeout(() => {
        const battle = activeBattles.get(battleId)
        if (battle?.status === 'active') expireBattle(battleId)
        battleTimeouts.delete(battleId)
    }, INACTIVITY_TIMEOUT)
    battleTimeouts.set(battleId, timeout)
}

const resetBattleTimeout = (battleId) => {
    const battle = activeBattles.get(battleId)
    if (battle?.status === 'active') {
        battle.lastAction = Date.now()
        setBattleTimeout(battleId)
    }
}

const finishBattle = (battle) => {
    if (battleTimeouts.has(battle.id)) {
        clearTimeout(battleTimeouts.get(battle.id))
        battleTimeouts.delete(battle.id)
    }
    const winnerId = battle[battle.winner]?.userId
    const loserId = battle[battle.loser]?.userId
    if (!winnerId || !loserId) return
    const now = Date.now()
    battleCooldowns.set(winnerId, now + BATTLE_COOLDOWN)
    battleCooldowns.set(loserId, now + BATTLE_COOLDOWN)
    battle.rewards = {
        winner: { userId: winnerId, xp: 100 },
        loser: { userId: loserId, xp: 20 }
    }
    setTimeout(() => activeBattles.delete(battle.id), 60000)
}

const expireBattle = (battleId) => {
    const battle = activeBattles.get(battleId)
    if (!battle || battle.status !== 'active') return
    battle.status = 'expired'
    battle.winner = battle.currentTurn === 'challenger' ? 'opponent' : 'challenger'
    battle.loser = battle.currentTurn
    finishBattle(battle)
}

const getBattleSummary = (battle) => {
    try {
        return {
            id: battle.id, turn: battle.turn, status: battle.status, currentTurn: battle.currentTurn,
            challenger: {
                userId: battle.challenger?.userId,
                pokemonName: battle.challenger?.pokemon?.displayName || 'Unknown',
                currentHp: battle.challenger?.currentHp || 0,
                maxHp: battle.challenger?.pokemon?.stats?.maxHp || 100
            },
            opponent: {
                userId: battle.opponent?.userId,
                pokemonName: battle.opponent?.pokemon?.displayName || 'Unknown',
                currentHp: battle.opponent?.currentHp || 0,
                maxHp: battle.opponent?.pokemon?.stats?.maxHp || 100
            },
            winner: battle.winner, rewards: battle.rewards
        }
    } catch { return null }
}

// Nueva fórmula de daño balanceada
export const calculateDamage = (attacker, defender, moveType = 'normal') => {
    const level = attacker.level
    const attackStat = attacker.stats.attack
    const defenseStat = defender.stats.defense

    const baseDamage = Math.floor(
        (( (2 * level) / 5 + 2) * MOVE_POWER * attackStat) / defenseStat / 50
    ) + 2

    const typeMultiplier = getTypeMultiplier(moveType, defender.types)
    const finalDamage = Math.floor(baseDamage * typeMultiplier)

    return Math.max(1, finalDamage)
}

export const createBattleRequest = (challengerId, opponentId, challengerPokemon) => {
    if (!challengerId || !opponentId || !challengerPokemon) return { error: 'INVALID_PARAMETERS' }
    if (battleRequests.size >= MAX_PENDING_REQUESTS) {
        const now = Date.now()
        for (const [id, req] of battleRequests.entries())
            if (now - req.createdAt > 120000) battleRequests.delete(id)
    }
    const now = Date.now()
    if (battleCooldowns.has(challengerId) && battleCooldowns.get(challengerId) > now)
        return { error: 'COOLDOWN', remaining: battleCooldowns.get(challengerId) - now }
    if (battleCooldowns.has(opponentId) && battleCooldowns.get(opponentId) > now)
        return { error: 'OPPONENT_COOLDOWN', remaining: battleCooldowns.get(opponentId) - now }
    if (isInBattle(challengerId)) return { error: 'ALREADY_IN_BATTLE' }
    if (isInBattle(opponentId)) return { error: 'OPPONENT_IN_BATTLE' }

    const requestId = `req_${now}_${Math.random().toString(36).substr(2, 5)}`
    const request = {
        id: requestId, challenger: challengerId, opponent: opponentId,
        challengerPokemon: challengerPokemon.toJSON?.() || challengerPokemon,
        createdAt: now, status: 'pending'
    }
    battleRequests.set(requestId, request)
    setTimeout(() => battleRequests.delete(requestId), 120000)
    return { success: true, requestId, request }
}

export const acceptBattle = (requestId, opponentId, opponentPokemon) => {
    const request = battleRequests.get(requestId)
    if (!request) return { error: 'REQUEST_NOT_FOUND' }
    if (request.opponent !== opponentId) return { error: 'NOT_OPPONENT' }
    if (request.status !== 'pending') return { error: 'ALREADY_PROCESSED' }
    if (activeBattles.size >= MAX_ACTIVE_BATTLES) return { error: 'SERVER_BUSY' }

    const battle = {
        id: `battle_${Date.now()}`, turn: 1, status: 'active',
        challenger: {
            userId: request.challenger,
            pokemon: Pokemon.fromJSON(request.challengerPokemon),
            currentHp: request.challengerPokemon.stats?.maxHp || 100
        },
        opponent: {
            userId: opponentId,
            pokemon: opponentPokemon,
            currentHp: opponentPokemon.stats?.maxHp || 100
        },
        winner: null, loser: null, log: [],
        createdAt: Date.now(), lastAction: Date.now()
    }
    battle.firstAttacker = (battle.opponent.pokemon.stats.speed > battle.challenger.pokemon.stats.speed) ? 'opponent' : 'challenger'
    battle.currentTurn = battle.firstAttacker
    activeBattles.set(battle.id, battle)
    battleRequests.delete(requestId)
    setBattleTimeout(battle.id)
    return { success: true, battleId: battle.id, battle }
}

export const denyBattle = (requestId, opponentId) => {
    const request = battleRequests.get(requestId)
    if (!request || request.opponent !== opponentId) return { error: 'REQUEST_NOT_FOUND' }
    battleRequests.delete(requestId)
    return { success: true }
}

export const executeAttack = (battleId, attackerId) => {
    const battle = activeBattles.get(battleId)
    if (!battle) return { error: 'BATTLE_NOT_FOUND' }
    if (battle.status !== 'active') return { error: 'BATTLE_ENDED' }
    const isChallenger = attackerId === battle.challenger.userId
    if (!isChallenger && attackerId !== battle.opponent.userId) return { error: 'NOT_IN_BATTLE' }
    const attackerSide = isChallenger ? 'challenger' : 'opponent'
    if (battle.currentTurn !== attackerSide) return { error: 'NOT_YOUR_TURN' }

    const attacker = battle[attackerSide]
    const defender = battle[attackerSide === 'challenger' ? 'opponent' : 'challenger']
    const moveType = attacker.pokemon.types[0] || 'normal'
    const damage = calculateDamage(attacker.pokemon, defender.pokemon, moveType)
    const effectiveness = getTypeMultiplier(moveType, defender.pokemon.types)

    defender.currentHp = Math.max(0, defender.currentHp - damage)
    battle.log.push({ turn: battle.turn, attacker: attackerSide, moveType, damage, effectiveness, defenderRemainingHp: defender.currentHp })
    resetBattleTimeout(battleId)

    if (defender.currentHp <= 0) {
        battle.status = 'finished'
        battle.winner = attackerSide
        battle.loser = attackerSide === 'challenger' ? 'opponent' : 'challenger'
        if (battleTimeouts.has(battleId)) {
            clearTimeout(battleTimeouts.get(battleId))
            battleTimeouts.delete(battleId)
        }
        finishBattle(battle)
        return { success: true, finished: true, winner: attackerSide, damage, effectiveness, moveType, battle: getBattleSummary(battle) }
    }

    battle.turn++
    battle.currentTurn = attackerSide === 'challenger' ? 'opponent' : 'challenger'
    battle.lastAction = Date.now()
    return { success: true, finished: false, damage, effectiveness, moveType, defenderRemainingHp: defender.currentHp, nextTurn: battle.currentTurn, battle: getBattleSummary(battle) }
}

export const isInBattle = (userId) => {
    for (const battle of activeBattles.values())
        if (battle.status === 'active' && (battle.challenger?.userId === userId || battle.opponent?.userId === userId)) return true
    return false
}

export const getUserBattle = (userId) => {
    for (const battle of activeBattles.values())
        if (battle.challenger?.userId === userId || battle.opponent?.userId === userId) return battle
    return null
}

export const getPendingRequest = (userId) => {
    for (const request of battleRequests.values())
        if (request.opponent === userId) return request
    return null
}

export const checkCooldown = (userId) => {
    const cd = battleCooldowns.get(userId)
    return cd && cd > Date.now() ? cd - Date.now() : 0
}

// ===== CAMBIAR POKÉMON (AGREGADO) =====
export const applySwitch = (battle, userId, team, idx) => {
    const isChallenger = userId === battle.challenger.userId
    const side = isChallenger ? 'challenger' : 'opponent'
    const opp = isChallenger ? 'opponent' : 'challenger'
    
    if (battle.currentTurn !== side) return { error: 'NOT_YOUR_TURN' }
    if (battle.status !== 'active') return { error: 'BATTLE_ENDED' }
    
    const oldPokemon = battle[side].pokemon
    const newPokemon = team[idx - 1]
    
    if (!newPokemon) return { error: 'INVALID_POKEMON' }
    if (newPokemon.currentHp <= 0) return { error: 'POKEMON_FAINTED' }
    
    battle[side].pokemon = Pokemon.fromJSON(newPokemon)
    battle[side].currentHp = newPokemon.currentHp || newPokemon.stats?.maxHp || 100
    
    battle.turn++
    battle.currentTurn = opp
    battle.lastAction = Date.now()
    resetBattleTimeout(battle.id)
    
    return {
        old: oldPokemon.displayName || oldPokemon.name || 'Pokémon',
        new: battle[side].pokemon.displayName || battle[side].pokemon.name || 'Pokémon',
        nextTurn: battle[opp].userId
    }
}

// ===== RENDIRSE (AGREGADO) =====
export const surrenderBattle = (battleId, userId) => {
    const battle = activeBattles.get(battleId)
    if (!battle) return { error: 'BATTLE_NOT_FOUND' }
    if (battle.status !== 'active') return { error: 'BATTLE_ENDED' }
    
    const isChallenger = userId === battle.challenger.userId
    if (!isChallenger && userId !== battle.opponent.userId) return { error: 'NOT_IN_BATTLE' }
    
    const winner = isChallenger ? 'opponent' : 'challenger'
    const loser = isChallenger ? 'challenger' : 'opponent'
    
    battle.status = 'finished'
    battle.winner = winner
    battle.loser = loser
    
    finishBattle(battle)
    
    return { winner }
}

export { activeBattles, battleRequests, getTypeMultiplier }
