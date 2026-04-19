global.namebot = 'Asta Bot'
global.vs = '2.0.0'
global.prefix = '.'
global.libreria = 'Baileys Multi Device'

global.dev = '𝕱𝖊𝖗𝖓𝖆𝖓𝖉𝖔'
global.etiqueta = '𝕱𝖊𝖗𝖓𝖆𝖓𝖉𝖔'

// Owners globales - pueden ser números o JIDs completos
global.owner = [
  ['5214183357841', 'Fernando', true],
  ['5216631079388', 'neykoor', true]
]

// Enlaces por defecto
global.channel = 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
global.IDchannel = '120363399175402285@newsletter'
global.github = 'https://github.com/Fer280809/asta-.git'
global.grupo = 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC'
global.comunidad = 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO'
global.icono = 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg'
global.firma = '© Asta Bot - Todos los derechos reservados'
global.logo = 'https://raw.githubusercontent.com/Fer280809/Asta_bot/main/lib/catalogo.jpg'

// Opciones
global.modoPublico = true
global.antiPrivado = false

// Mensajes personalizados
global.msj = {
  espera: '⏳ Procesando...',
  error: '❌ Error al ejecutar el comando',
  sinPermisos: '🚫 No tienes permisos',
  soloOwner: '👑 Solo para owners',
  soloGrupo: '👥 Solo en grupos',
  soloPrivado: '👤 Solo en privado',
  validcommand: '❌ Este comando *${cmd}* no existe'
}

// Base de datos temporal
global.db = { data: { users: {} } }
global.plugins = {}

console.log('✅ Configuración global cargada')
