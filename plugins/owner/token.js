import { 
  createPremiumToken, 
  listTokens, 
  listPremiumUsers, 
  listAllSubprem 
} from '../../lib/premium.js'

let handler = async (m, { conn, args, command }) => {
  switch (command) {
    case 'tokenp':
      const result = createPremiumToken(m.sender)
      if (result.success) {
        await conn.sendMessage(m.chat, { 
          text: `🎫 *Token Premium Generado*\n\n🔑 \`${result.token}\`\n\n_Comparte este token para que pueda ser canjeado_` 
        }, { quoted: m })
      } else {
        await conn.sendMessage(m.chat, { text: result.message }, { quoted: m })
      }
      break
      
    case 'tokenlist':
      const tokens = listTokens(m.sender)
      if (tokens.success) {
        if (tokens.tokens.length === 0) {
          await conn.sendMessage(m.chat, { text: '📋 No hay tokens disponibles' }, { quoted: m })
        } else {
          let txt = '🎫 *Tokens Premium Disponibles*\n\n'
          tokens.tokens.forEach((t, i) => {
            txt += `${i + 1}. \`${t.token}\` - ${t.created}\n`
          })
          await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }
      } else {
        await conn.sendMessage(m.chat, { text: tokens.message }, { quoted: m })
      }
      break
      
    case 'premiumlist':
      const users = listPremiumUsers(m.sender)
      if (users.success) {
        if (users.users.length === 0) {
          await conn.sendMessage(m.chat, { text: '👤 No hay usuarios premium' }, { quoted: m })
        } else {
          let txt = '👑 *Usuarios Premium*\n\n'
          users.users.forEach((u, i) => {
            txt += `${i + 1}. +${u.number} - ${u.registered}\n`
          })
          await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }
      } else {
        await conn.sendMessage(m.chat, { text: users.message }, { quoted: m })
      }
      break
      
    case 'subpremlist':
      const subbots = listAllSubprem(m.sender)
      if (subbots.success) {
        if (subbots.subbots.length === 0) {
          await conn.sendMessage(m.chat, { text: '🤖 No hay sub-bots premium' }, { quoted: m })
        } else {
          let txt = '🤖 *Sub-Bots Premium*\n\n'
          subbots.subbots.forEach((s, i) => {
            txt += `${i + 1}. +${s.number}\n   📅 ${s.registered}\n   👤 Por: +${s.registeredBy}\n\n`
          })
          await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
        }
      } else {
        await conn.sendMessage(m.chat, { text: subbots.message }, { quoted: m })
      }
      break
  }
}

handler.help = ['tokenp', 'tokenlist', 'premiumlist', 'subpremlist']
handler.tags = ['owner']
handler.command = ['tokenp', 'tokenlist', 'premiumlist', 'subpremlist']
handler.owner = true

export default handler
