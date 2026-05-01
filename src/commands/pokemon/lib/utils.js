import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { getUserData, updateUserData } from '../../../../src/database/pokemonDB.js';

const cooldowns = new Map();
const activeWildBattlesMap = new Map();
const activePvpBattlesMap = new Map();

export const TYPE_EMOJIS = {
    normal: '⬜', fire: '🔥', water: '💧', electric: '⚡',
    grass: '🌿', ice: '❄️', fighting: '🥊', poison: '☠️',
    ground: '🟫', flying: '🦅', bug: '🐛', rock: '🪨',
    ghost: '👻', dragon: '🐲', steel: '⚙️', psychic: '🔮'
};

export function getTypeEmoji(type) {
    return TYPE_EMOJIS[type] || '❓';
}

// ========== NORMALIZACIÓN JID ==========
export function normalizeJidForDb(jid) {
    if (!jid || typeof jid !== 'string') return null;
    let normalized = jidNormalizedUser(jid);
    if (!normalized) return null;
    const numberPart = normalized.split('@')[0];
    if (numberPart && !isNaN(numberPart)) {
        return `${numberPart}@s.whatsapp.net`;
    }
    return normalized;
}

// ========== INICIALIZACIÓN DE USUARIO (con DB persistente) ==========
/**
 * Obtiene/crea el usuario Pokémon y opcionalmente actualiza su nombre de perfil.
 * @param {string} userId - JID del usuario (se normaliza)
 * @param {string|null} pushName - Nombre de WhatsApp (m.pushName)
 * @returns {object} Datos del usuario listos para usar
 */
export function initUser(userId, pushName = null) {
    const normalizedId = normalizeJidForDb(userId);
    if (!normalizedId) return null;

    let user = getUserData(normalizedId);

    // Asegurar campos y valores por defecto
    const poke = user.pokemonV1;
    poke.team = poke.team || [];
    poke.box = poke.box || [];
    poke.caught = poke.caught ?? 0;
    poke.released = poke.released ?? 0;
    poke.trained = poke.trained ?? 0;
    poke.totalXpGained = poke.totalXpGained ?? 0;
    poke.currentRoute = poke.currentRoute || 1;
    poke.lastHealV1 = poke.lastHealV1 || 0;
    poke.lastWildV1 = poke.lastWildV1 || 0;
    poke.lastTrainV1 = poke.lastTrainV1 || 0;
    poke.trainDaily = poke.trainDaily || null;
    poke.trainCount = poke.trainCount ?? 0;
    poke.starterClaimed = poke.starterClaimed ?? false;

    if (!poke.search) {
        poke.search = { streak: 0, lastSearch: 0, dailyCount: 0, lastDailyReset: null };
    }
    if (!poke.inventory) {
        poke.inventory = { pokeball: 5 };
    }

    // --- Perfil de usuario (nombre) ---
    if (!user.profile) {
        user.profile = { name: null, lastSeen: 0 };
    }
    // Si se proporciona pushName y es diferente al guardado, lo actualiza
    if (pushName && pushName !== user.profile.name) {
        user.profile.name = pushName;
        user.profile.lastSeen = Date.now();
    } else if (pushName && !user.profile.lastSeen) {
        user.profile.lastSeen = Date.now();
    }

    // Persistir cualquier cambio (inicialización o nombre actualizado)
    updateUserData(normalizedId, user);

    return user;
}

// ========== INICIALIZACIÓN DE CHAT (sigue en global.db) ==========
export function initChat(chatId) {
    if (!global.db?.data?.chats) global.db.data.chats = {};
    if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {};
    const chat = global.db.data.chats[chatId];
    if (chat.pokemonV1Enabled === undefined) chat.pokemonV1Enabled = false;
    return chat;
}

export function generateEncounterId() {
    return `enc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

export function formatPokemonList(pokemonList, startIndex = 1) {
    return pokemonList.map((p, i) => {
        const index = startIndex + i;
        const shiny = p.shiny ? '✨ ' : '';
        return `${index}. ${shiny}${p.displayName} (Nv.${p.level}) ${p.types.map(t => getTypeEmoji(t)).join('')}`;
    }).join('\n');
}

export function getRarityText(id) {
    const rare = [25, 26, 35, 36, 37, 38];
    const uncommon = [2, 3, 5, 6, 8, 9, 12, 15, 18, 20, 22, 24, 31, 34, 36, 38, 40, 42, 45, 47, 49, 51];
    if (rare.includes(id)) return '🔴 Raro';
    if (uncommon.includes(id)) return '🟡 Poco común';
    return '🟢 Común';
}

export function formatNumber(num) {
    return num.toLocaleString('es-ES');
}

// ========== COOLDOWNS ==========
export function checkCooldown(userId, action, cooldownTime) {
    const key = `${userId}_${action}`;
    const last = cooldowns.get(key);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    return elapsed < cooldownTime ? cooldownTime - elapsed : 0;
}

export function setCooldown(userId, action, cooldownTime) {
    const key = `${userId}_${action}`;
    cooldowns.set(key, Date.now());
    setTimeout(() => {
        if (cooldowns.get(key) === Date.now()) cooldowns.delete(key);
    }, cooldownTime);
}

export function clearCooldown(userId, action) {
    cooldowns.delete(`${userId}_${action}`);
}

// ========== REGISTRO DE BATALLAS ==========
export function registerWildBattle(userId, encounterId) { activeWildBattlesMap.set(userId, encounterId); }
export function unregisterWildBattle(userId) { activeWildBattlesMap.delete(userId); }
export function isInWildBattle(userId) { return activeWildBattlesMap.get(userId) || null; }

export function registerPvpBattle(userId, battleId) { activePvpBattlesMap.set(userId, battleId); }
export function unregisterPvpBattle(userId) { activePvpBattlesMap.delete(userId); }
export function isInPvpBattle(userId) { return activePvpBattlesMap.get(userId) || null; }

export function isInAnyBattle(userId) {
    return isInWildBattle(userId) !== null || isInPvpBattle(userId) !== null;
}

// ========== UTILIDADES VISUALES ==========
export function formatHpBar(currentHp, maxHp) {
    const percent = Math.max(0, Math.min(10, Math.floor((currentHp / maxHp) * 10)));
    return `[${'█'.repeat(percent)}${'░'.repeat(10 - percent)}] ${currentHp}/${maxHp}`;
}

export function getEffectivenessMessage(multiplier) {
    if (multiplier > 1.5) return '💥 ¡Es súper efectivo!';
    if (multiplier > 0.1 && multiplier < 0.9) return '📉 No es muy efectivo...';
    if (multiplier === 0) return '❌ No afecta...';
    return '';
}