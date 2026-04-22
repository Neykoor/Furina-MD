export const config = {
  namebot: '『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』',
  vs: '2.0.0',
  prefix: '.',
  libreria: 'Baileys Multi Device',

  dev: 'Powered By ғᴇʀɴᴀɴᴅᴏ',
  etiqueta: '𝕱𝖊𝖗𝖓𝖆𝖓𝖉𝖔',
  author: "『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』 • Powered By 𝕱𝖊𝖗𝖓𝖆𝖓𝖉𝖔",

  owner: [
    ['5214183357841', 'Fernando', true],
    ['5356795360', 'Victor' true],
    ['5216631079388', 'Neykoor', true]
  ],

  channel: 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21',
  IDchannel: '120363399175402285@newsletter',
  github: 'https://github.com/Fer2809fl/asta-.git',
  grupo: 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC',
  comunidad: 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO',
  icono: 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg',
  firma: '© Asta Bot - Todos los derechos reservados',
  logo: 'https://raw.githubusercontent.com/Fer2809fl/Asta_bot/refs/heads/main/assets/asta.jpg',

  modoPublico: true,
  antiPrivado: false,

  msj: {
    espera: '⏳ Procesando...',
    error: '❌ Error al ejecutar el comando',
    sinPermisos: '🚫 No tienes permisos',
    soloOwner: '👑 Solo para owners',
    soloGrupo: '👥 Solo en grupos',
    soloPrivado: '👤 Solo en privado',
    validcommand: '❌ Este comando *${cmd}* no existe'
  }
}

// Base de datos en memoria (legacy compat)
export const db = { data: { users: {}, chats: {} } }

// Asignar a global para compatibilidad con código existente
Object.assign(global, config)
global.db = db

export default config
