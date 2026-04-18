import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import chalk from 'chalk'
import NodeCache from 'node-cache'
import { printMensaje } from './print.js'
import { 
  normalize, 
  isGlobalOwner, 
  isPremium, 
  isSubbotPremium, 
  applyPremiumConfig,
  getUserType 
} from './premium.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.botLogoCache = null

const erroresRuntimeFile = path.join(process.cwd(), 'data', 'errores-runtime.json')
const groupCache = new NodeCache({ stdTTL: 25 })
const pluginsCache = new Map()

function registrarError(archivo, comando, sender, err) {
  try {
    let errores = []
    if (fs.existsSync(erroresRuntimeFile)) {
      errores = JSON.parse(fs.readFileSync(erroresRuntimeFile, 'utf-8'))
    }
    errores.unshift({
      archivo,
      comando,
      sender,
      error: err.message,
      stack: err.stack?.slice(0, 400) || '',
      fecha: new Date().toLocaleString()
    })
    fs.mkdirSync(path.dirname(erroresRuntimeFile), { recursive: true })
    fs.writeFileSync(erroresRuntimeFile, JSON.stringify(errores.slice(0, 30), null, 2))
  } catch {}
}

function getTipoMensaje(msg) {
  if (!msg?.message) return null
  const tipos = [
    'conversation', 'imageMessage', 'videoMessage', 'audioMessage',
    'stickerMessage', 'documentMessage', 'extendedTextMessage',
    'reactionMessage', 'locationMessage', 'contactMessage',
    'pollCreationMessage', 'buttonsResponseMessage', 'listResponseMessage',
    'templateButtonReplyMessage', 'interactiveResponseMessage'
  ]
  for (const tipo of tipos) {
    if (msg.message?.[tipo]) return tipo
  }
  return null
}

function cargarPlugins(dir) {
  let archivos = []
  if (!fs.existsSync(dir)) return archivos
  try {
    for (const item of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        archivos = archivos.concat(cargarPlugins(fullPath))
      } else if (item.endsWith('.js') && !item.startsWith('_')) {
        archivos.push(fullPath)
      }
    }
  } catch (e) {
    console.error(chalk.red('Error cargando plugins:'), e.message)
  }
  return archivos
}

function checkOwner(sender) {
  return isGlobalOwner(sender)
}

async function getAdminInfo(conn, groupJid, senderJid) {
  try {
    let metadata = groupCache.get(groupJid)
    if (!metadata) {
      metadata = await conn.groupMetadata(groupJid)
      groupCache.set(groupJid, metadata)
    }

    const participants = metadata.participants || []
    const senderNum = normalize(senderJid)

    const botJid = conn.user?.id || conn.user?.jid || ''
    const botNum = normalize(botJid)
    const botLid = conn.user?.lid ? normalize(conn.user.lid) : null

    const botP = participants.find(p => {
      const pNum = normalize(p.id)
      return pNum === botNum || (botLid && pNum === botLid)
    })
    const userP = participants.find(p => normalize(p.id) === senderNum)

    const isAdmin = userP?.admin === 'admin' || userP?.admin === 'superadmin'
    const isBotAdmin = botP?.admin === 'admin' || botP?.admin === 'superadmin'

    return { isAdmin, isBotAdmin, participants, metadata }
  } catch (e) {
    console.error(chalk.red('Error getAdminInfo:'), e.message)
    return { isAdmin: false, isBotAdmin: false, participants: [], metadata: null }
  }
}

async function dfail(tipo, m, conn, cmd = '') {
  const mensajes = {
    owner: '👑 Este comando es solo para *owners*.',
    group: '👥 Este comando solo funciona en *grupos*.',
    private: '👤 Este comando solo funciona en *privado*.',
    admin: '🛡️ Necesitas ser *administrador* del grupo.',
    botAdmin: '🤖 Necesito ser *administrador* para ejecutar esto.',
    premium: '👑 Este comando es solo para usuarios *premium*.',
    invalid: `❌ El comando *${cmd}* no existe.`
  }

  let textoBase = mensajes[tipo] || '🚫 Sin permiso.'

  if (tipo === 'invalid' && global.msj?.validcommand) {
    textoBase = global.msj.validcommand.replace('${cmd}', cmd)
  }

  const chatId = m.key?.remoteJid || m.chat
  const channelLink = global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'

  const emoji = {
    owner: '👑',
    group: '👥',
    private: '👤',
    admin: '🛡️',
    botAdmin: '🤖',
    premium: '⭐',
    invalid: ''
  }[tipo] || '🚫'

  let mensajeFinal = textoBase
  if (tipo !== 'invalid') {
    mensajeFinal = `${emoji} ${textoBase}`
  }

  let logoBuffer = global.botLogoCache
  if (!logoBuffer && global.icono) {
    try {
      const res = await fetch(global.icono)
      logoBuffer = Buffer.from(await res.arrayBuffer())
      global.botLogoCache = logoBuffer
    } catch (e) {
      console.error('Error al cargar el logo del bot:', e.message)
      logoBuffer = null
    }
  }

  try {
    await conn.sendMessage(chatId, {
      text: mensajeFinal,
      contextInfo: {
        externalAdReply: {
          title: global.namebot || 'Bot',
          body: 'Canal Oficial',
          thumbnail: logoBuffer,
          mediaType: 1,
          renderLargerThumbnail: false,
          showAdAttribution: false,
          sourceUrl: channelLink
        }
      }
    })
  } catch {
    try {
      await conn.sendMessage(chatId, { text: mensajeFinal })
    } catch {}
  }
}

export async function handler(conn, chat) {
  try {
    if (!conn || !chat) return

    if (!conn.processedMessages) conn.processedMessages = new Set()
    const messageId = chat.messages?.[0]?.key?.id
    if (!messageId) return
    if (conn.processedMessages.has(messageId)) return
    conn.processedMessages.add(messageId)
    setTimeout(() => conn.processedMessages?.delete(messageId), 5000)

    const m = chat.messages[0]
    if (!m?.message) return
    if (m.key?.remoteJid === 'status@broadcast') return
    if (m.message?.protocolMessage) return
    if (m.message?.senderKeyDistributionMessage) return

    const tipo = getTipoMensaje(m)
    if (!tipo) return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith('@g.us')
    const fromMe = m.key?.fromMe || false
    const usedPrefix = global.prefix || '.'

    let text = ''
    try {
      text =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        ''
    } catch { text = '' }

    if (!fromMe) printMensaje(m, conn)
    if (!text || !text.startsWith(usedPrefix)) return

    const args = text.slice(usedPrefix.length).trim().split(/\s+/)
    const command = args.shift()?.toLowerCase()
    if (!command) return

    const isOwner = checkOwner(sender)
    const senderNum = normalize(sender)
    
    // Verificar premium y aplicar configuración
    const isUserPremium = isPremium(sender) || isSubbotPremium(sender)
    const userType = getUserType(sender)
    
    if (isUserPremium) {
      applyPremiumConfig(sender)
    }

    let isAdmin = false
    let isBotAdmin = false
    let groupMetadata = null
    let participants = []

    if (isGroup) {
      const info = await getAdminInfo(conn, from, sender)
      isAdmin = info.isAdmin
      isBotAdmin = info.isBotAdmin
      groupMetadata = info.metadata
      participants = info.participants
    }

    m.chat = from
    m.sender = sender
    m.senderNum = senderNum
    m.timestamp = Date.now()
    m.isGroup = isGroup
    m.isAdmin = isAdmin
    m.isBotAdmin = isBotAdmin
    m.isOwner = isOwner
    m.isPremium = isUserPremium
    m.userType = userType
    m.text = text

    const pluginsDir = path.join(process.cwd(), 'plugins')
    const archivos = cargarPlugins(pluginsDir)

    let found = false

    for (const filePath of archivos) {
      try {
        let plugin
        const useCache = !global.debug && !process.env.DEBUG
        const cacheKey = `${filePath}?${command}`

        if (useCache && pluginsCache.has(cacheKey)) {
          plugin = pluginsCache.get(cacheKey)
        } else {
          const fileUrl = global.debug
            ? pathToFileURL(filePath).href + `?update=${Date.now()}`
            : pathToFileURL(filePath).href
          const module = await import(fileUrl)
          plugin = module.default || module
          if (useCache && plugin?.command) {
            pluginsCache.set(cacheKey, plugin)
          }
        }

        if (!plugin?.command) continue

        const cmds = [
          ...(Array.isArray(plugin.command) ? plugin.command : [plugin.command]),
          ...(Array.isArray(plugin.aliases) ? plugin.aliases : [])
        ].map(c => c.toLowerCase())

        if (!cmds.includes(command)) continue

        found = true

        const relativo = path.relative(pluginsDir, filePath)

        console.log(
          chalk.bgBlue.white(`\n⚡ COMANDO: ${usedPrefix}${command}`),
          chalk.gray(`[${relativo}]`),
          chalk.gray(`args: [${args.join(', ')}]`)
        )

        // Verificaciones de permisos
        if (plugin.owner && !isOwner) { await dfail('owner', m, conn); return }
        if (plugin.group && !isGroup) { await dfail('group', m, conn); return }
        if (plugin.private && isGroup) { await dfail('private', m, conn); return }
        if (plugin.admin && !isAdmin) { await dfail('admin', m, conn); return }
        if (plugin.botAdmin && !isBotAdmin) { await dfail('botAdmin', m, conn); return }
        if (plugin.premium && !isUserPremium && !isOwner) { await dfail('premium', m, conn); return }

        try {
          await plugin(m, {
            conn,
            args,
            usedPrefix,
            isOwner,
            command,
            isGroup,
            isAdmin,
            isBotAdmin,
            groupMetadata,
            participants,
            senderNum,
            fromMe,
            text: args.join(' '),
            isPremium: isUserPremium,
            userType
          })
        } catch (err) {
          console.error(chalk.red(`\n❌ ERROR EN [${relativo}]:`), err.message)
          registrarError(relativo, command, sender, err)
          const errorMsg = global.msj?.error || '❌ Error al ejecutar el comando.'
          try {
            await conn.sendMessage(from, { text: errorMsg }, { quoted: m })
          } catch {}
        }

        return

      } catch (err) {
        console.error(chalk.red(`❌ Error cargando plugin:`), err.message)
      }
    }

    if (!found) {
      await dfail('invalid', m, conn, command)
    }

  } catch (error) {
    console.error(chalk.red('\n❌ ERROR CRÍTICO EN HANDLER:'), error.message)
  }
}