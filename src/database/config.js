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
    ['5356795360', 'Victor', true],
    ['5216631079388', 'Neykoor', true]
  ],

  channel: 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21',
  IDchannel: '120363399175402285@newsletter',
  github: 'https://github.com/Fer2809fl/asta-.git',
  grupo: 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC',
  comunidad: 'https://chat.whatsapp.com/KKwDZn5vDAE6MhZFAcVQeO',
  icono: 'https://raw.githubusercontent.com/Fer2809fl/asta-/refs/heads/main/src/assets/logo-bot.png',
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


export const db = { data: { users: {}, chats: {} } }


Object.assign(global, config)
global.db = db

global.publicURL = process.env.PUBLIC_URL || ''
global.webSecret = process.env.WEB_SECRET || 'asta-web-2024-secret-key'
global.description = 'Bot WhatsApp 24/7 con Panel Web'

global.BREVO_API_KEY = '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'
global.BREVO_EMAIL = 'soportestudybot@gmail.com'

global.Api = {
  youtube: async (url, type = 'video') => {
    try {
      const apiUrl = `https://api.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.success) {
        const downloadUrl = type === 'audio' ? data.result.mp3?.url || data.result.audio : data.result.mp4?.url || data.result.video
        return {
          title: data.result.title || 'Video de YouTube',
          url: downloadUrl || data.result.url,
          thumbnail: data.result.thumbnail || '',
          duration: data.result.duration || ''
        }
      }
      return null
    } catch (e) {
      console.error('Error YouTube API:', e.message)
      return null
    }
  },
  instagram: async (url) => {
    try {
      const apiUrl = `https://api.davidcyriltech.my.id/download/instagram?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.success && data.result) {
        return {
          title: data.result.title || 'Instagram Media',
          url: data.result.url || data.result[0]?.url,
          thumbnail: data.result.thumbnail || ''
        }
      }
      return null
    } catch (e) {
      console.error('Error Instagram API:', e.message)
      return null
    }
  },
  tiktok: async (url) => {
    try {
      const apiUrl = `https://api.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.success && data.result) {
        return {
          title: data.result.title || 'Video de TikTok',
          url: data.result.video || data.result.url,
          thumbnail: data.result.thumbnail || ''
        }
      }
      return null
    } catch (e) {
      console.error('Error TikTok API:', e.message)
      return null
    }
  },
  facebook: async (url) => {
    try {
      const apiUrl = `https://api.davidcyriltech.my.id/download/facebook?url=${encodeURIComponent(url)}`
      const res = await fetch(apiUrl)
      const data = await res.json()
      if (data.success && data.result) {
        return {
          title: data.result.title || 'Video de Facebook',
          url: data.result.url || data.result.video,
          thumbnail: data.result.thumbnail || ''
        }
      }
      return null
    } catch (e) {
      console.error('Error Facebook API:', e.message)
      return null
    }
  }
}

export default config