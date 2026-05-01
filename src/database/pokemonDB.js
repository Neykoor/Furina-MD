import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'database', 'pokemon-data.json');
let cache = null;
let saveTimeout = null;

const DEFAULT_USER = {
    // Perfil básico (nombre, última vez visto)
    profile: {
        name: null,
        lastSeen: 0
    },
    // Datos del juego Pokémon
    pokemonV1: {
        team: [],
        box: [],
        caught: 0,
        released: 0,
        trained: 0,
        totalXpGained: 0,
        currentRoute: 1,
        lastHealV1: 0,
        lastWildV1: 0,
        lastTrainV1: 0,
        trainDaily: null,
        trainCount: 0,
        search: {
            streak: 0,
            lastSearch: 0,
            dailyCount: 0,
            lastDailyReset: null
        },
        inventory: {
            pokeball: 5
        },
        starterClaimed: false
    }
};

function loadData() {
    if (cache) return cache;
    try {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        if (fs.existsSync(DATA_FILE)) {
            cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } else {
            cache = {};
            saveDataSync();
        }
    } catch (e) {
        console.error('❌ Error cargando datos Pokémon:', e.message);
        cache = {};
    }
    return cache;
}

function saveData() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
        saveTimeout = null;
    }, 2000);
}

function saveDataSync() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Obtiene los datos de un usuario. Si no existe, crea uno nuevo con los valores por defecto.
 * @param {string} userId - JID normalizado (número@s.whatsapp.net)
 * @returns {object} Datos del usuario
 */
export function getUserData(userId) {
    const data = loadData();
    if (!data[userId]) {
        data[userId] = JSON.parse(JSON.stringify(DEFAULT_USER));
        saveData();
    }
    return data[userId];
}

/**
 * Actualiza los datos de un usuario y los guarda en el archivo.
 * @param {string} userId
 * @param {object} userData
 */
export function updateUserData(userId, userData) {
    const data = loadData();
    data[userId] = userData;
    saveData();
}

/**
 * Devuelve todos los usuarios registrados.
 */
export function getAllUsers() {
    return loadData();
}

/**
 * Reinicia todos los datos Pokémon (borra el archivo).
 */
export function resetAllUsersData() {
    cache = {};
    saveDataSync();
    console.log('🔄 Datos Pokémon globales reiniciados.');
}