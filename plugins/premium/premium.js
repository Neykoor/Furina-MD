import { 
    redeemPremiumToken, 
    isPremium, 
    getPremiumInfo,
    setSubbotPremium,
    removeSubbotPremium,
    normalize,
    isGlobalOwner,
    isSubbotPremium,
    loadPremiumUsers,
    savePremiumUsers,
    loadTokens,
    saveTokens
} from '../../lib/premium.js'

let handler = async (m, { conn, args, command, usedPrefix }) => {
    const botNumber = normalize(conn.user?.jid || conn.user?.id || '')
    const isBotPremium = isSubbotPremium(botNumber) || isPremium(botNumber)
    const isOwner = isGlobalOwner(m.sender)

    if (!isBotPremium && !isOwner) {
        return conn.sendMessage(m.chat, { 
            text: '⭐ Este comando es solo para *bots premium* y *owners*.' 
        }, { quoted: m })
    }

    const premium = isPremium(m.sender)
    const info = getPremiumInfo(m.sender)

    switch (command) {
        case 'canjearp':
        case 'canjeartoken':
            if (premium) {
                return conn.sendMessage(m.chat, { text: '❌ Ya eres premium' }, { quoted: m })
            }
            if (!args[0]) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Proporciona token\n\nEjemplo: ${usedPrefix}canjearp ASTA-XXXXX` 
                }, { quoted: m })
            }
            const result = redeemPremiumToken(m.sender, args[0].toUpperCase())
            await conn.sendMessage(m.chat, { text: result.message }, { quoted: m })
            break

        case 'mipremium':
        case 'miprem':
            if (!premium) {
                return conn.sendMessage(m.chat, { text: '❌ No eres premium' }, { quoted: m })
            }
            let txt = '👑 *Info Premium*\n\n'
            txt += `📅 ${new Date(info.registeredAt).toLocaleString()}\n`
            txt += `🎫 ${info.token}\n`
            txt += `⏰ Activo\n\n`
            txt += `💡 ${usedPrefix}config para editar`
            await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            break

        case 'subprem':
            if (!premium) return conn.sendMessage(m.chat, { text: '❌ Solo premium' }, { quoted: m })
            let target
            if (m.mentionedJid?.length > 0) {
                target = m.mentionedJid[0]
            } else if (args[0]) {
                target = args[0] + '@s.whatsapp.net'
            } else {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Menciona o escribe número\n\nEjemplo: ${usedPrefix}subprem @usuario` 
                }, { quoted: m })
            }
            const resultSub = setSubbotPremium(m.sender, target)
            await conn.sendMessage(m.chat, { 
                text: resultSub.message,
                mentions: resultSub.mentions || []
            }, { quoted: m })
            break

        case 'delsubprem':
            if (!premium) return conn.sendMessage(m.chat, { text: '❌ Solo premium' }, { quoted: m })
            let target2
            if (m.mentionedJid?.length > 0) {
                target2 = m.mentionedJid[0]
            } else if (args[0]) {
                target2 = args[0] + '@s.whatsapp.net'
            } else {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Menciona o escribe número\n\nEjemplo: ${usedPrefix}delsubprem @usuario` 
                }, { quoted: m })
            }
            const resultDel = removeSubbotPremium(m.sender, target2)
            await conn.sendMessage(m.chat, { text: resultDel.message }, { quoted: m })
            break

        case 'listsubprem':
        case 'missubbots':
            if (!premium) return conn.sendMessage(m.chat, { text: '❌ Solo premium' }, { quoted: m })
            const { loadSubprem } = await import('../../lib/premium.js')
            const subData = loadSubprem()
            const mySubs = Object.entries(subData.subbots)
                .filter(([_, info]) => normalize(info.registeredBy) === normalize(m.sender))

            if (mySubs.length === 0) {
                await conn.sendMessage(m.chat, { text: '📋 No tienes sub-bots premium' }, { quoted: m })
            } else {
                let txt = '🤖 *Mis Sub-bots Premium*\n\n'
                mySubs.forEach(([num, info], i) => {
                    txt += `${i + 1}. +${num}\n`
                    txt += `   📅 ${new Date(info.registeredAt).toLocaleString()}\n\n`
                })
                txt += `Total: ${mySubs.length}`
                await conn.sendMessage(m.chat, { text: txt }, { quoted: m })
            }
            break

        case 'premregalar':
        case 'premr': {
            if (!premium) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Debes ser premium para regalar.' 
                }, { quoted: m })
            }

            if (!args[0]) {
                return conn.sendMessage(m.chat, { 
                    text: `🎁 *Regalar Premium*\n\nTransfiere tu membresía a otro usuario.\n\n*Uso:*\n${usedPrefix}premregalar @usuario\n${usedPrefix}premregalar 521XXXXXXXXXX\n\n⚠️ *Perderás tu premium.*` 
                }, { quoted: m })
            }

            let targetUser
            if (m.mentionedJid?.length > 0) {
                targetUser = m.mentionedJid[0]
            } else if (args[0]) {
                const num = args[0].replace(/[^0-9]/g, '')
                if (num.length < 10) {
                    return conn.sendMessage(m.chat, { 
                        text: '❌ Número inválido (mínimo 10 dígitos).' 
                    }, { quoted: m })
                }
                targetUser = num + '@s.whatsapp.net'
            } else {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Menciona o escribe número\n\nEjemplo: ${usedPrefix}premregalar @usuario` 
                }, { quoted: m })
            }

            const targetNormalized = normalize(targetUser)
            const senderNormalized = normalize(m.sender)

            if (targetNormalized === senderNormalized) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ No puedes regalarte a ti mismo.' 
                }, { quoted: m })
            }

            if (isPremium(targetUser)) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Este usuario ya es premium.' 
                }, { quoted: m })
            }

            await conn.sendMessage(m.chat, { 
                text: `🎁 *Confirmar*\n\n¿Regalar premium a @${targetNormalized.split('@')[0]}?\n\n⚠️ *Perderás tu premium.*\n\nResponde *confirmar* para proceder.` 
            }, { quoted: m })

            const confirmHandler = async (msg) => {
                if (msg.sender !== m.sender) return
                if (msg.body?.toLowerCase() !== 'confirmar') {
                    await conn.sendMessage(m.chat, { 
                        text: '❌ Cancelado.' 
                    }, { quoted: msg })
                    conn.ev.off('messages.upsert', confirmHandler)
                    return
                }

                const result = await transferPremium(senderNormalized, targetNormalized)

                if (result.success) {
                    await conn.sendMessage(m.chat, { 
                        text: `✅ *Premium transferido*\n\n🎁 @${targetNormalized.split('@')[0]} ahora es premium.\n📅 ${new Date().toLocaleString()}`,
                        mentions: [targetUser, m.sender]
                    }, { quoted: msg })

                    await conn.sendMessage(targetUser, { 
                        text: `🎉 *¡Felicidades!*\n\n@${senderNormalized.split('@')[0]} te regaló premium.\n\n👑 Beneficios:\n• 5 sub-bots\n• Personalización\n• Soporte prioritario\n\n${usedPrefix}mipremium para ver info.`,
                        mentions: [m.sender]
                    }).catch(() => {})
                } else {
                    await conn.sendMessage(m.chat, { 
                        text: `❌ Error: ${result.message}` 
                    }, { quoted: msg })
                }

                conn.ev.off('messages.upsert', confirmHandler)
            }

            setTimeout(() => conn.ev.off('messages.upsert', confirmHandler), 60000)
            conn.ev.on('messages.upsert', confirmHandler)
            break
        }

        case 'premium':
        case 'prem':
            let premTxt = '👑 *Premium Asta Bot*\n\n'
            premTxt += `*Beneficios:*\n`
            premTxt += `• 5 sub-bots\n`
            premTxt += `• Personalización completa\n`
            premTxt += `• Sub-bots premium ilimitados\n`
            premTxt += `• Soporte prioritario\n`
            premTxt += `• Regalar premium (${usedPrefix}premregalar)\n\n`

            if (premium) {
                premTxt += `✅ *Eres premium*\n`
                premTxt += `🎫 ${info.token}\n\n`
                premTxt += `${usedPrefix}config para editar`
            } else {
                premTxt += `❌ *No eres premium*\n\n`
                premTxt += `Contacta owner para token:\n`
                premTxt += `${usedPrefix}tokenp (si eres owner)`
            }

            await conn.sendMessage(m.chat, { text: premTxt }, { quoted: m })
            break
    }
}

handler.help = [
    'canjearp', 'mipremium', 'subprem', 'delsubprem', 'listsubprem', 'premium', 'premregalar'
]
handler.tags = ['premium']
handler.command = [
    'canjearp', 'canjeartoken', 'mipremium', 'miprem', 
    'subprem', 'delsubprem', 'listsubprem', 'missubbots', 
    'premium', 'prem', 'premregalar', 'premr'
]

export default handler

async function transferPremium(fromUserId, toUserId) {
    try {
        const users = loadPremiumUsers()
        const tokens = loadTokens()

        const fromInfo = users[fromUserId]
        if (!fromInfo || !fromInfo.token) {
            return { success: false, message: 'No tienes token válido' }
        }

        const token = fromInfo.token

        users[toUserId] = {
            ...fromInfo,
            registeredAt: Date.now(),
            transferredFrom: fromUserId
        }
        delete users[fromUserId]

        if (tokens[token]) {
            tokens[token].owner = toUserId
            tokens[token].transferredFrom = fromUserId
            tokens[token].transferredAt = Date.now()
        }

        savePremiumUsers(users)
        saveTokens(tokens)

        return { success: true, message: 'Premium transferido' }
    } catch (e) {
        return { success: false, message: e.message }
    }
}