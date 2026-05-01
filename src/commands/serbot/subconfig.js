import path from 'path'

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
    const ownerNum = cleanNum(subConfig.owner || conn.ownerId)
    const isGlobalOwner = (global.owner || []).some(o => {
        const oNum = cleanNum(Array.isArray(o) ? o[0] : o)
        return oNum && oNum === senderNum
    })

    if (senderNum !== ownerNum && !isGlobalOwner) {
        return conn.sendMessage(from, {
            text: `🔒 Solo el *owner* (@${ownerNum}) de este Sub-Bot puede usar este comando.`
        }, { quoted: m, mentions: [`${ownerNum}@s.whatsapp.net`] })
    }

    switch (command) {

        case 'config': {
            if (!args[0]) {
                const logos = subConfig.logos || {}
                const logoEntries = Object.entries(logos).filter(([_, v]) => v)
                const logoList = logoEntries.length > 0
                    ? logoEntries.map(([k, v]) => `   • *${k}* · ✅`).join('\n')
                    : '   _(ninguno configurado)_'

                return conn.sendMessage(from, {
                    text:
                        `╭━━━━━━━━━━━━━━━━━━╮
│  ⚙️ *CONFIG SUB-BOT*
╰━━━━━━━━━━━━━━━━━━╯

📛 *Nombre* · ${subConfig.name || '_(por defecto)_'}
🌐 *Modo* · ${subConfig.mode === 'private' ? '🔐 Privado' : '🔓 Público'}

🖼️ *Logos configurados:*
${logoList}

*Comandos disponibles:*
 • *.config nombre* \`Texto\`
 • *.config modo* \`public/private\`
 • *.config logo* \`zona\` \`URL\` _(quitar: none)_
 • *.config reset confirmar*
 • *.restartbot* — reiniciar
 • *.cleanbot* — limpiar caché y reiniciar

*Zonas disponibles:*
 • menu · menu principal
 • gacha · menú gacha
 • grupo · menú grupo
 • antilinks · menú antilinks
 • rpg · menú RPG
 • games · menú juegos`
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
                    const zona = args[1]?.toLowerCase()
                    const url = args.slice(2).join(' ').trim()

                    const zonasValidas = ['menu', 'gacha', 'grupo', 'antilinks', 'rpg', 'games']

                    if (!zona || !zonasValidas.includes(zona)) {
                        return conn.sendMessage(from, {
                            text: `❌ Uso: *.config logo* \`zona\` \`URL\`\n\n*Zonas disponibles:*\n • menu\n • gacha\n • grupo\n • antilinks\n • rpg\n • games\n\n*Ejemplo:*\n*.config logo menu https://tu-imagen.jpg*`
                        }, { quoted: m })
                    }

                    if (!url || ['none', 'quitar', 'remove', 'default', 'off'].includes(url.toLowerCase())) {
                        const logosActuales = subConfig.logos || {}
                        delete logosActuales[zona]
                        saveSubConfig(userId, { logos: logosActuales })
                        return conn.sendMessage(from, {
                            text: `✅ Logo de *${zona}* eliminado.`
                        }, { quoted: m })
                    }

                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        return conn.sendMessage(from, {
                            text: `❌ Debes usar una URL válida (https://...)\nPara quitar: *.config logo ${zona} none*`
                        }, { quoted: m })
                    }

                    const logos = { ...(subConfig.logos || {}) }
                    logos[zona] = url

                    saveSubConfig(userId, { logos })

                    return conn.sendMessage(from, {
                        text: `✅ Logo de *${zona}* guardado.\n\n🖼️ URL: ${url}\n🔄 Usa el menú correspondiente para ver el cambio.`
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
                        logos: {}
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

handler.help = ['config', 'restartbot', 'cleanbot']
handler.tags = ['serbot']
handler.command = [
    'config',
    'restartbot', 'reiniciarbot',
    'cleanbot', 'limpiarbot'
]

export default handler