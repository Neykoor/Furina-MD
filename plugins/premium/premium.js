import { 
  redeemPremiumToken, 
  isPremium, 
  getPremiumInfo,
  setSubbotPremium,
  removeSubbotPremium,
  normalize 
} from '../../lib/premium.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
  const premium = isPremium(m.sender)
  const info = getPremiumInfo(m.sender)
  
  switch (command) {
    case 'canjearp':
    case 'canjeartoken':
      if (premium) {
        return conn.sendMessage(m.chat, { text: '❌ Ya eres usuario premium' }, { quoted: m })
      }
      if (!args[0]) {
        return conn.sendMessage(m.chat, { 
          text: `❌ Debes proporcionar un token\n\nEjemplo: ${usedPrefix}canjearp ASTA-XXXXX` 
        }, { quoted: m })
      }
      const result = redeemPremiumToken(m.sender, args[0].toUpperCase())
      await conn.sendMessage(m.chat, { text: result.message }, { quoted: m })
      break
      
    case 'mipremium':
    case 'miprem':
      if (!premium) {
        return conn.sendMessage(m.chat, { text: '❌ No eres usuario premium' }, { quoted: m })
      }
      let txt = '👑 *Información Premium*\n\n'
      txt += `📅 Registrado: ${new Date(info.registeredAt).toLocaleString()}\n`
      txt += `🎫 Token: ${info.token}\n`
      txt += `⏰ Estado: Activo\n\n`
      txt += `💡 Usa ${usedPrefix}config para ver/editar tu configuración`
      await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
      break
      
    case 'subprem':
      if (!premium) return conn.sendMessage(m.chat, { text: '❌ Comando solo para premium' }, { quoted: m })
      let target
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        target = m.mentionedJid[0]
      } else if (args[0]) {
        target = args[0] + '@s.whatsapp.net'
      } else {
        return conn.sendMessage(m.chat, { 
          text: `❌ Menciona o escribe el número\n\nEjemplo: ${usedPrefix}subprem @usuario` 
        }, { quoted: m })
      }
      const resultSub = setSubbotPremium(m.sender, target)
      await conn.sendMessage(m.chat, { 
        text: resultSub.message,
        mentions: resultSub.mentions || []
      }, { quoted: m })
      break
      
    case 'delsubprem':
      if (!premium) return conn.sendMessage(m.chat, { text: '❌ Comando solo para premium' }, { quoted: m })
      let target2
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        target2 = m.mentionedJid[0]
      } else if (args[0]) {
        target2 = args[0] + '@s.whatsapp.net'
      } else {
        return conn.sendMessage(m.chat, { 
          text: `❌ Menciona o escribe el número\n\nEjemplo: ${usedPrefix}delsubprem @usuario` 
        }, { quoted: m })
      }
      const resultDel = removeSubbotPremium(m.sender, target2)
      await conn.sendMessage(m.chat, { text: resultDel.message }, { quoted: m })
      break
      
    case 'listsubprem':
    case 'missubbots':
      if (!premium) return conn.sendMessage(m.chat, { text: '❌ Comando solo para premium' }, { quoted: m })
      const { loadSubprem } = await import('../lib/premium.js')
      const subData = loadSubprem()
      const mySubs = Object.entries(subData.subbots)
        .filter(([_, info]) => normalize(info.registeredBy) === normalize(m.sender))
      
      if (mySubs.length === 0) {
        await conn.sendMessage(m.chat, { text: '📋 No tienes sub-bots premium registrados' }, { quoted: m })
      } else {
        let txt = '🤖 *Mis Sub-bots Premium*\n\n'
        mySubs.forEach(([num, info], i) => {
          txt += `${i + 1}. +${num}\n`
          txt += `   📅 Registrado: ${new Date(info.registeredAt).toLocaleString()}\n\n`
        })
        txt += `Total: ${mySubs.length} sub-bot(s)`
        await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
      }
      break
      
    case 'premium':
    case 'prem':
      let premTxt = '👑 *Sistema Premium Asta Bot*\n\n'
      premTxt += `*Beneficios:*\n`
      premTxt += `• Hasta 5 sub-bots simultáneos\n`
      premTxt += `• Personalización completa del bot\n`
      premTxt += `• Sub-bots premium ilimitados\n`
      premTxt += `• Prioridad en soporte\n\n`
      
      if (premium) {
        premTxt += `✅ *Ya eres usuario premium*\n`
        premTxt += `🎫 Token: ${info.token}\n\n`
        premTxt += `Usa ${usedPrefix}config para ver/editar tu configuración`
      } else {
        premTxt += `❌ *No eres premium*\n\n`
        premTxt += `Contacta a un owner para obtener un token:\n`
        premTxt += `${usedPrefix}tokenp (si eres owner)`
      }
      
      await conn.sendMessage(m.chat, { text: premTxt }, { quoted: m })
      break
  }
}

handler.help = [
  'canjearp', 'mipremium', 'subprem', 'delsubprem', 'listsubprem', 'premium'
]
handler.tags = ['premium']
handler.command = [
  'canjearp', 'canjeartoken', 'mipremium', 'miprem', 
  'subprem', 'delsubprem', 'listsubprem', 'missubbots', 
  'premium', 'prem'
]

export default handler