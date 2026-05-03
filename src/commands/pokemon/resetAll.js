// resetAll.js (comando para reiniciar datos Pokémon globalmente)
import { getAllUsers, updateUserData, resetAllUsersData } from '../../database/pokemonDB.js';

let handler = async (m, { conn }) => {
    const allUsers = getAllUsers();
    let resetCount = 0;

    for (const userId in allUsers) {
        const user = allUsers[userId];
        // Reiniciar solo los datos Pokémon, preservando el perfil (nombre, etc.)
        user.pokemonV1 = {
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
            search: { streak: 0, lastSearch: 0, dailyCount: 0, lastDailyReset: null },
            inventory: { pokeball: 5 },
            starterClaimed: false
        };
        updateUserData(userId, user);
        resetCount++;
    }

    await m.reply(
        `🔄 *Reseteo global completado*\n\n` +
        `✅ Se han reiniciado los datos Pokémon de *${resetCount}* usuarios.\n` +
        `📦 Todos los equipos y cajas han sido vaciados.\n` +
        `📊 Contadores de capturas, liberaciones y experiencia puestos a 0.\n\n` +
        `⚠️ *Acción irreversible* – cada usuario deberá empezar desde cero.`
    );
};

handler.help = ['resetearpokemonglobal'];
handler.tags = ['owner'];
handler.command = [
    'resetearpokemonglobal',
    'resetpokemonglobal',
    'clearallpokemon'
];
handler.rowner = true; // Solo el owner del bot puede ejecutarlo

export default handler;