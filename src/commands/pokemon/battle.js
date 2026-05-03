/**
 * Comando: .battle @usuario
 * Batalla PvP entre dos entrenadores Pokémon
 */

import {
    createBattleRequest, acceptBattle, denyBattle, executeAttack,
    isInBattle, getUserBattle, getPendingRequest, checkCooldown,
    applySwitch, surrenderBattle
} from './lib/battle.js'
import { Pokemon } from './lib/pokemon.js'
import {
    initUser, getEffectivenessMessage, isInWildBattle,
    registerPvpBattle, unregisterPvpBattle, normalizeJidForDb,
    formatNumber, getTypeEmoji
} from './lib/utils.js'
import { applyItemEffect, useItem, ITEMS } from './lib/items.js'

const CD_TIME = 3000
const CD_MAP = new Map()

const hpBar = (cur, max) => {
    const filled = Math.max(0, Math.min(10, Math.floor((cur / max) * 10)))
    return `[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}] ${cur}/${max}`
}

const getBattleStatusText = (battle) => {
    const challenger = battle.challenger
    const opponent = battle.opponent
    return `⚔️ *BATALLA PvP* ⚔️\n${'═'.repeat(30)}\n` +
        `🥊 *${challenger.pokemon.displayName}* (Nv.${challenger.pokemon.level}) | @${challenger.userId.split('@')[0]}\n` +
        `❤️ ${hpBar(challenger.currentHp, challenger.pokemon.stats.maxHp)}\n\n` +
        `🛡️ *${opponent.pokemon.displayName}* (Nv.${opponent.pokemon.level}) | @${opponent.userId.split('@')[0]}\n` +
        `❤️ ${hpBar(opponent.currentHp, opponent.pokemon.stats.maxHp)}\n${'═'.repeat(30)}\n` +
        `🔄 Turno ${battle.turn} | ⏳ @${battle.currentTurn === 'challenger' ? challenger.userId.split('@')[0] : opponent.userId.split('@')[0]}`
}

const giveVictoryRewards = (battle, winnerSide, loserSide) => {
    const winnerId = battle[winnerSide].userId
    const loserId = battle[loserSide].userId
    const winnerUser = initUser(winnerId)
    const loserUser = initUser(loserId)

    let text = `🏆 *¡${battle[winnerSide].pokemon.displayName} GANA!* 🏆\n${'═'.repeat(30)}\n` +
        `🎁 @${winnerId.split('@')[0]}: +100 XP\n🎁 @${loserId.split('@')[0]}: +20 XP`

    if (winnerUser?.pokemonV1.team[0]) {
        const pokemon = Pokemon.fromJSON(winnerUser.pokemonV1.team[0])
        const leveled = pokemon.gainXp(100)
        if (leveled.leveledUp) text += `\n⬆️ ¡${pokemon.displayName} subió a Nv.${pokemon.level}!`
        winnerUser.pokemonV1.team[0] = pokemon.toJSON()
    }

    if (loserUser?.pokemonV1.team[0]) {
        const pokemon = Pokemon.fromJSON(loserUser.pokemonV1.team[0])
        pokemon.gainXp(20)
        loserUser.pokemonV1.team[0] = pokemon.toJSON()
    }

    return text
}

// Función mejorada para obtener el destinatario (sin await innecesarios)
function getTargetFromMessage(m) {
    let rawJid = null

    // 1. mentionedJid (propiedad directa, no es promesa)
    if (m.mentionedJid && m.mentionedJid.length > 0) {
        rawJid = m.mentionedJid[0]
    }
    // 2. contextInfo (para mensajes con botones)
    else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
        rawJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    // 3. Si es respuesta a un mensaje
    else if (m.quoted && m.quoted.sender) {
        rawJid = m.quoted.sender
    }
    // 4. Buscar @número en el texto
    else {
        const text = m.text || ''
        const match = text.match(/@(\d+)/)
        if (match) {
            rawJid = `${match[1]}@s.whatsapp.net`
        }
    }

    if (!rawJid) return null
    // Normalizar a formato consistente
    return normalizeJidForDb(rawJid)
}

const setCooldownCmd = (sender) => {
    if (CD_MAP.has(sender)) clearTimeout(CD_MAP.get(sender))
    const timeoutId = setTimeout(() => CD_MAP.delete(sender), CD_TIME)
    CD_MAP.set(sender, timeoutId)
}

const isOnCooldownCmd = (sender) => CD_MAP.has(sender)

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (isOnCooldownCmd(m.sender)) return
    setCooldownCmd(m.sender)

    if (isInWildBattle(m.sender)) {
        return m.reply(`❌ No puedes participar en batallas PvP mientras tienes un Pokémon salvaje activo.`)
    }

    const user = initUser(m.sender, m.pushName)
    const team = user?.pokemonV1?.team || []

    if (['battle', 'batalla', 'retar'].includes(command)) {
        return await cmdRetar(m, conn, usedPrefix, team, user)
    }

    if (['accept', 'aceptar'].includes(command)) {
        return await cmdAccept(m, conn, team)
    }

    if (['deny', 'rechazar'].includes(command)) {
        return await cmdDeny(m, conn)
    }

    const battle = getUserBattle(m.sender)
    if (!battle) {
        if (['attack', 'use', 'switch', 'surrender'].includes(command)) {
            return m.reply('❌ No estás en batalla')
        }
        return
    }

    const isChallenger = battle.challenger.userId === m.sender
    const mySide = isChallenger ? 'challenger' : 'opponent'
    const enemySide = isChallenger ? 'opponent' : 'challenger'

    if (['attack', 'atacar'].includes(command)) {
        return await cmdAttack(m, conn, battle, mySide, enemySide)
    }

    if (['use', 'usar', 'item'].includes(command)) {
        return await cmdUse(m, conn, args, battle, mySide, enemySide, user, team)
    }

    if (['switch', 'cambiar'].includes(command)) {
        return await cmdSwitch(m, conn, usedPrefix, args, battle, mySide, enemySide, team)
    }

    if (['surrender', 'rendirse'].includes(command)) {
        return await cmdSurrender(m, conn, battle, mySide, enemySide)
    }
}

// ========== RETAR ==========
async function cmdRetar(m, conn, usedPrefix, team, user) {
    if (!m.isGroup) return m.reply('❌ Solo grupos')
    if (!team.length) return m.reply('❌ No tienes ningún Pokémon en tu equipo.')
    const myP = Pokemon.fromJSON(team[0])
    if (myP.currentHp <= 0) return m.reply(`❌ ${myP.displayName} está debilitado.`)

    const target = getTargetFromMessage(m)
    if (!target || target === m.sender) {
        return m.reply(`❌ Menciona o responde al usuario que quieres retar.\nEjemplo: *${usedPrefix}battle @usuario*`)
    }

    console.log(`[BATTLE] Retando a JID normalizado: ${target}`)

    const targetUser = initUser(target)
    if (!targetUser) {
        return m.reply(`❌ No se pudo obtener datos del usuario.`)
    }

    const targetTeam = targetUser.pokemonV1?.team || []
    const targetBox = targetUser.pokemonV1?.box || []

    console.log(`[BATTLE] Target team length: ${targetTeam.length}, box length: ${targetBox.length}`)

    if (targetTeam.length === 0) {
        if (targetBox.length > 0) {
            return m.reply(`❌ @${target.split('@')[0]} tiene Pokémon en la caja, pero no en el equipo. Debe usar *${usedPrefix}switch toteam [número]* para poner uno en su equipo.`, null, { mentions: [target] })
        }
        return m.reply(`❌ @${target.split('@')[0]} no tiene ningún Pokémon.`, null, { mentions: [target] })
    }

    if (checkCooldown(m.sender) || checkCooldown(target)) {
        return m.reply('⏳ Cooldown activo (5 min después de cada batalla).')
    }
    if (isInBattle(m.sender) || isInBattle(target)) {
        return m.reply('❌ Uno de los dos ya está en una batalla.')
    }
    if (isInWildBattle(target)) {
        return m.reply(`❌ @${target.split('@')[0]} está en una batalla salvaje.`, null, { mentions: [target] })
    }

    const request = createBattleRequest(m.sender, target, myP)
    if (request.error) {
        if (request.error === 'OPPONENT_COOLDOWN') return m.reply(`⏳ El oponente está en cooldown.`)
        return m.reply(`❌ ${request.error}`)
    }

    return m.reply(
        `⚔️ *DESAFÍO*\n@${m.sender.split('@')[0]} reta a @${target.split('@')[0]}\n` +
        `🥊 ${myP.displayName} (Nv.${myP.level}) ❤️ ${myP.currentHp}/${myP.stats.maxHp}\n\n` +
        `*${usedPrefix}accept* | *${usedPrefix}deny*`,
        null,
        { mentions: [m.sender, target] }
    )
}

// ========== ACCEPT ==========
async function cmdAccept(m, conn, team) {
    const request = getPendingRequest(m.sender)
    if (!request) return m.reply('❌ Sin solicitudes')
    if (!team.length) return m.reply('❌ Sin Pokémon')
    const myP = Pokemon.fromJSON(team[0])
    if (myP.currentHp <= 0) return m.reply('❌ Pokémon debilitado')

    if (isInWildBattle(m.sender)) {
        return m.reply(`❌ No puedes aceptar una batalla PvP mientras tienes un encuentro salvaje.`)
    }

    const result = acceptBattle(request.id, m.sender, myP)
    if (result.error) return m.reply(`❌ ${result.error}`)

    registerPvpBattle(m.sender, result.battle.id)
    registerPvpBattle(request.challenger, result.battle.id)

    return m.reply(
        getBattleStatusText(result.battle),
        null,
        { mentions: [result.battle.challenger.userId, result.battle.opponent.userId] }
    )
}

// ========== DENY ==========
async function cmdDeny(m, conn) {
    const request = getPendingRequest(m.sender)
    if (!request) return m.reply('❌ Sin solicitudes')
    denyBattle(request.id, m.sender)
    return m.reply(`❌ @${m.sender.split('@')[0]} rechazó`, null, {
        mentions: [m.sender, request.challenger]
    })
}

// ========== ATTACK ==========
async function cmdAttack(m, conn, battle, mySide, enemySide) {
    try {
        const result = executeAttack(battle.id, m.sender)
        if (result.error) {
            const errorMsg = result.error === 'NOT_YOUR_TURN' ? '⏳ No es tu turno' : `❌ ${result.error}`
            return m.reply(errorMsg)
        }

        const effectivenessMsg = getEffectivenessMessage(result.effectiveness)
        let text = `⚔️ *${battle[mySide].pokemon.displayName}* ataca!\n💥 ${result.damage}`
        if (effectivenessMsg) text += ` ${effectivenessMsg}`

        if (result.finished) {
            const winnerSide = result.winner
            const loserSide = winnerSide === 'challenger' ? 'opponent' : 'challenger'
            const victoryText = giveVictoryRewards(battle, winnerSide, loserSide)
            unregisterPvpBattle(battle.challenger.userId)
            unregisterPvpBattle(battle.opponent.userId)
            return m.reply(text + '\n\n' + victoryText, null, {
                mentions: [battle.challenger.userId, battle.opponent.userId]
            })
        }

        return m.reply(text + '\n\n' + getBattleStatusText(battle), null, {
            mentions: [battle[result.nextTurn].userId]
        })
    } catch (err) {
        console.error('Error en executeAttack:', err)
        return m.reply('❌ Error al ejecutar el ataque')
    }
}

// ========== USE ITEM ==========
async function cmdUse(m, conn, args, battle, mySide, enemySide, user, team) {
    if (battle.currentTurn !== mySide) return m.reply('⏳ No es tu turno')

    const itemId = args[0]?.toLowerCase()
    if (!itemId || !ITEMS[itemId] || ITEMS[itemId].type === 'ball') {
        const itemsList = Object.keys(ITEMS).filter(k => ITEMS[k].type !== 'ball').join(', ')
        return m.reply(`❌ Item no válido. Opciones: ${itemsList}`)
    }
    if (!(user.pokemonV1.inventory?.[itemId] > 0)) {
        return m.reply(`❌ No tienes ${ITEMS[itemId].name}`)
    }

    const pokemon = battle[mySide].pokemon
    const effect = applyItemEffect(pokemon, itemId)
    if (!effect.success) return m.reply(`❌ ${effect.message}`)

    useItem(user, itemId, 1)
    battle[mySide].currentHp = pokemon.currentHp
    team[0] = pokemon.toJSON()

    battle.currentTurn = enemySide
    battle.lastAction = Date.now()

    return m.reply(
        `🎒 @${m.sender.split('@')[0]} usó ${ITEMS[itemId].name}\n${effect.message}\n\n${getBattleStatusText(battle)}`,
        null,
        { mentions: [m.sender, battle[enemySide].userId] }
    )
}

// ========== SWITCH ==========
async function cmdSwitch(m, conn, usedPrefix, args, battle, mySide, enemySide, team) {
    if (battle.currentTurn !== mySide) return m.reply('⏳ No es tu turno')

    if (!args[0]) {
        let list = `🔄 *CAMBIAR*\n${'═'.repeat(25)}\n`
        team.forEach((pokeData, i) => {
            const poke = Pokemon.fromJSON(pokeData)
            list += `${i + 1}. ${poke.shiny ? '✨ ' : ''}${poke.displayName} ` +
                `${poke.currentHp > 0 ? '✅' : '❌'}${i === 0 ? ' (ACTUAL)' : ''}\n`
        })
        return m.reply(list + `\n💡 *${usedPrefix}switch [número]*`)
    }

    const idx = parseInt(args[0])
    if (isNaN(idx) || idx < 1 || idx > team.length) {
        return m.reply(`❌ Número inválido (1-${team.length})`)
    }
    if (idx === 1) return m.reply(`❌ Ya usas a ${team[0].displayName}`)

    const newPokemon = Pokemon.fromJSON(team[idx - 1])
    if (newPokemon.currentHp <= 0) return m.reply(`❌ ${newPokemon.displayName} debilitado`)

    const result = applySwitch(battle, m.sender, team, idx)
    if (result.error) return m.reply(`❌ ${result.error}`)

    return m.reply(
        `🔄 ${result.old} vuelve. ⚔️ ¡${result.new} entra!\n\n${getBattleStatusText(battle)}`,
        null,
        { mentions: [m.sender, result.nextTurn] }
    )
}

// ========== SURRENDER ==========
async function cmdSurrender(m, conn, battle, mySide, enemySide) {
    const result = surrenderBattle(battle.id, m.sender)
    if (result.error) return m.reply(`❌ ${result.error}`)

    unregisterPvpBattle(battle.challenger.userId)
    unregisterPvpBattle(battle.opponent.userId)

    const winnerId = battle[result.winner].userId
    return m.reply(
        `🏳️ @${m.sender.split('@')[0]} se rindió\n🏆 @${winnerId.split('@')[0]} gana`,
        null,
        { mentions: [m.sender, winnerId] }
    )
}

handler.help = ['battle', 'accept', 'deny', 'attack', 'use', 'switch', 'surrender']
handler.tags = ['pokemon-v1']
handler.command = [
    'battle', 'batalla', 'retar',
    'accept', 'aceptar',
    'deny', 'rechazar',
    'attack', 'atacar',
    'use', 'usar', 'item',
    'switch', 'cambiar',
    'surrender', 'rendirse'
]
handler.group = true

export default handler