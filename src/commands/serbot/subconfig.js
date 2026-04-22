import path from 'path'

const parseBoolean = (val) => {
    if (!val) return null
    const s = String(val).toLowerCase()
    if (['on', 'true', '1', 'si', 'sí', 'yes', 'activar', 'enable'].includes(s)) return true
    if (['off', 'false', '0', 'no', 'desactivar', 'disable'].includes(s)) return false
    return null
}

let handler = async (m, { conn, args, command }) => {
    const from = m.chat

    const { getSubConfig, saveSubConfig, cleanSubBotCache, createSubBot, cleanNum } = await import('./serbot.js')
    const userId = cleanNum(conn.userId || conn.user?.jid)
    const subConfig = conn.subConfig || getSubConfig(userId)

    if (!conn.isSubBot) {
        return conn.sendMessage(from, {
            text: `❌ Este comando solo funciona en *Sub-Bots*.\nUsa *.qr* o *.code* para vincular uno.`
        }, { quoted: m })
    }

    const senderNum = cleanNum(m.sender)
    const ownerNum = cleanNum(conn.ownerId || subConfig.owner)
    const isGlobalOwner = (global.owner || []).some(o => {
        return cleanNum(Array.isArray(o) ? o[0] : o) === senderNum
    })

    if (senderNum !== ownerNum && !isGlobalOwner) {
        return conn.sendMessage(from, {
            text: `🔒 Solo el *owner* de este Sub-Bot puede usar este comando.`
        }, { quoted: m })
    }

    switch (command) {

        case 'config': {
            if (!args[0]) {
                const logoStatus = subConfig.logoUrl ? '🔗 URL' : '❌ Por defecto'
                return conn.sendMessage(from, {
                    text:
                        `╭━━━━━━━━━━━━━━━━━━╮
│  ⚙️ *CONFIG SUB-BOT*
╰━━━━━━━━━━━━━━━━━━╯

📛 *Nombre* · ${subConfig.name || '_(por defecto)_'}
🌐 *Modo* · ${subConfig.mode === 'private' ? '🔐 Privado' : '🔓 Público'}
🚫 *Anti-privado* · ${subConfig.antiPrivate ? '✅ On' : '❌ Off'}
🛡️ *Anti-spam* · ${subConfig.antiSpam ? '✅ On' : '❌ Off'}
⏱️ *Cooldown* · ${subConfig.cooldown}ms
🖼️ *Logo* · ${logoStatus}

*Comandos disponibles:*
 • *.config nombre* \`Texto\`
 • *.config modo* \`public/private\`
 • *.config logo* \`URL\` _(quitar: none)_
 • *.config cooldown* \`milisegundos\`
 • *.config reset confirmar*
 • *.antiprivado* on/off
 • *.antispam* on/off
 • *.restartbot* — reiniciar
 • *.cleanbot* — limpiar caché y reiniciar`
                }, { quoted: m })
            }

            const action = args[0].toLowerCase()
            const value = args.slice(1).join(' ').trim()

            switch (action) {
                case 'nombre':
                case 'name': {
                    if (!value) return conn.sendMessage(from, {
                        text: `❌ Uso: *.config nombre* NuevoNombre`
                    }, { quoted: m })
                    const name = value.slice(0, 30)
                    saveSubConfig(userId, { name })
                    return conn.sendMessage(from, {
                        text: `✅ Nombre actualizado: *${name}*`
                    }, { quoted: m })
                }

                case 'modo':
                case 'mode': {
                    const modo = value?.toLowerCase()
                    if (!['public', 'private', 'publico', 'privado'].includes(modo)) {
                        return conn.sendMessage(from, {
                            text: `❌ Uso: *.config modo* public/private`
                        }, { quoted: m })
                    }
                    const modeVal = modo.startsWith('priv') ? 'private' : 'public'
                    saveSubConfig(userId, { mode: modeVal })
                    return conn.sendMessage(from, {
                        text: `✅ Modo: ${modeVal === 'private' ? '🔐 Privado (solo owner)' : '🔓 Público (todos)'}`
                    }, { quoted: m })
                }

                case 'logo':
                case 'icono': {
                    if (!value || ['none', 'quitar', 'remove', 'default'].includes(value.toLowerCase())) {
                        saveSubConfig(userId, { logoUrl: null })
                        return conn.sendMessage(from, { text: '✅ Logo eliminado. Usando el por defecto.' }, { quoted: m })
                    }
                    if (!value.startsWith('http://') && !value.startsWith('https://')) {
                        return conn.sendMessage(from, {
                            text: `❌ Debes usar una URL válida (https://...)\nPara quitar: *.config logo none*`
                        }, { quoted: m })
                    }
                    saveSubConfig(userId, { logoUrl: value })
                    return conn.sendMessage(from, { text: `✅ Logo URL guardado: ${value}` }, { quoted: m })
                }

                case 'cooldown':
                case 'cd': {
                    const ms = parseInt(value)
                    if (isNaN(ms) || ms < 0 || ms > 60000) {
                        return conn.sendMessage(from, {
                            text: `❌ Uso: *.config cooldown* 0-60000 (ms)\nEjemplo: *.config cooldown 3000*`
                        }, { quoted: m })
                    }
                    saveSubConfig(userId, { cooldown: ms })
                    return conn.sendMessage(from, {
                        text: `✅ Cooldown actualizado: *${ms}ms*`
                    }, { quoted: m })
                }

                case 'reset': {
                    if (args[1]?.toLowerCase() !== 'confirmar') {
                        return conn.sendMessage(from, {
                            text: `⚠️ ¿Seguro? Esto reinicia *toda* la configuración.\n\nConfirma con: *.config reset confirmar*`
                        }, { quoted: m })
                    }
                    saveSubConfig(userId, {
                        name: null, mode: 'public',
                        antiPrivate: false, antiSpam: true, cooldown: 3000, logoUrl: null
                    })
                    return conn.sendMessage(from, {
                        text: `✅ Configuración reseteada a los valores por defecto.`
                    }, { quoted: m })
                }

                default:
                    return conn.sendMessage(from, {
                        text: `❌ Opción *${action}* no reconocida.\nUsa *.config* para ver todas las opciones.`
                    }, { quoted: m })
            }
        }

        case 'antiprivado':
        case 'antiprivate': {
            const bool = parseBoolean(args[0])
            if (bool === null) {
                return conn.sendMessage(from, {
                    text: `🚫 *Anti-Privado*\nEstado: ${subConfig.antiPrivate ? '✅ Activado' : '❌ Desactivado'}\n\nUso: *.antiprivado on/off*`
                }, { quoted: m })
            }
            saveSubConfig(userId, { antiPrivate: bool })
            return conn.sendMessage(from, {
                text: `${bool ? '✅' : '❌'} Anti-Privado ${bool ? 'activado' : 'desactivado'}.\n${bool ? '🔒 Solo el owner puede escribirte en privado.' : '🔓 Cualquiera puede escribirte en privado.'}`
            }, { quoted: m })
        }

        case 'antispam':
        case 'antiflood': {
            const bool = parseBoolean(args[0])
            if (bool === null) {
                return conn.sendMessage(from, {
                    text: `🛡️ *Anti-Spam*\nEstado: ${subConfig.antiSpam ? '✅ Activado' : '❌ Desactivado'}\nCooldown: ${subConfig.cooldown}ms\n\nUso: *.antispam on/off*`
                }, { quoted: m })
            }
            saveSubConfig(userId, { antiSpam: bool })
            return conn.sendMessage(from, {
                text: `${bool ? '✅' : '❌'} Anti-Spam ${bool ? 'activado' : 'desactivado'}.`
            }, { quoted: m })
        }

        case 'restartbot':
        case 'reiniciarbot': {
            await conn.sendMessage(from, {
                text: `🔄 *Reiniciando Sub-Bot...*\n\n⏱️ Sesión: ✅ se mantiene\n⚙️ Config: ✅ se mantiene\n⏳ ~5 segundos...`
            }, { quoted: m })

            const savedCfg = getSubConfig(userId)
            const sessionPath = path.join('./session/Sub-bots', userId)

            try {
                conn.ev?.removeAllListeners()
                if (conn.ws?.readyState === 1) conn.ws.close()
                const idx = global.conns.indexOf(conn)
                if (idx > -1) global.conns.splice(idx, 1)
                global.subBots.delete(userId)
                global.subBots.delete(conn.user?.jid)
            } catch { }

            await new Promise(r => setTimeout(r, 2500))

            await createSubBot({
                sessionPath,
                m: null,
                conn: null,
                userId,
                isAutoStart: true,
                mcode: false,
                savedConfig: savedCfg
            })
            break
        }

        case 'cleanbot':
        case 'limpiarbot': {
            await conn.sendMessage(from, {
                text: `🧹 *Limpiando caché y reiniciando...*\n\n🗑️ Limpiando archivos temporales...\n⏱️ Sesión: ✅ se mantiene\n⚙️ Config: ✅ se mantiene\n⏳ ~10 segundos...`
            }, { quoted: m })

            const savedCfg = getSubConfig(userId)
            const sessionPath = path.join('./session/Sub-bots', userId)

            try {
                conn.ev?.removeAllListeners()
                if (conn.ws?.readyState === 1) conn.ws.close()
                const idx = global.conns.indexOf(conn)
                if (idx > -1) global.conns.splice(idx, 1)
                global.subBots.delete(userId)
                global.subBots.delete(conn.user?.jid)
            } catch { }

            await cleanSubBotCache(userId)
            await new Promise(r => setTimeout(r, 4000))

            await createSubBot({
                sessionPath,
                m: null,
                conn: null,
                userId,
                isAutoStart: true,
                mcode: false,
                savedConfig: savedCfg
            })
            break
        }

        default:
            return conn.sendMessage(from, {
                text: `❌ Comando desconocido. Usa *.config* para ver las opciones.`
            }, { quoted: m })
    }
}

handler.help = ['config', 'restartbot', 'cleanbot', 'antiprivado', 'antispam']
handler.tags = ['serbot']
handler.command = [
    'config',
    'antiprivado', 'antiprivate',
    'antispam', 'antiflood',
    'restartbot', 'reiniciarbot',
    'cleanbot', 'limpiarbot'
]

export default handler