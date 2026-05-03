import fs from 'fs'
import path from 'path'

const ANTI_DB = path.join(process.cwd(), 'data', 'anti-config.json')

// ══════════════════════════════════════════════════════════════════
// BASE DE DATOS
// ══════════════════════════════════════════════════════════════════
function loadDb() {
    if (!fs.existsSync(ANTI_DB)) return {}
    try { return JSON.parse(fs.readFileSync(ANTI_DB, 'utf-8')) } catch { return {} }
}

function isEnabled(jid, key) {
    return loadDb()[jid]?.[key] === true
}

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

// ══════════════════════════════════════════════════════════════════
// HELPER: verificar si el sender es owner global
// ══════════════════════════════════════════════════════════════════
function isOwnerGlobal(senderJid) {
    const senderNum = cleanNum(senderJid)
    return (global.owner || []).some(o => {
        const oNum = cleanNum(Array.isArray(o) ? o[0] : o)
        return oNum === senderNum
    })
}

// ══════════════════════════════════════════════════════════════════
// HELPER: eliminar mensaje y notificar
// isBotAdmin se recibe como parámetro — NO se recalcula internamente
// ══════════════════════════════════════════════════════════════════
async function deleteMsg(sock, msg, groupJid, reason, userJid, isBotAdmin) {
    if (!isBotAdmin) return // Bot no es admin → no puede borrar, salir limpio
    try {
        await sock.sendMessage(groupJid, { delete: msg.key })
        const num = cleanNum(userJid)
        await sock.sendMessage(groupJid, {
            text: `🛡️ @${num} ${reason}`,
            mentions: [userJid]
        })
    } catch {}
}

// ══════════════════════════════════════════════════════════════════
// DETECTOR PRINCIPAL
// Recibe isBotAdmin e isAdmin directamente desde message-handler.js
// que ya los calculó con getAdminInfo() — sin doble llamada a groupMetadata
// ══════════════════════════════════════════════════════════════════
export async function antiMasterDetector(sock, m, { isBotAdmin = false, isAdmin = false } = {}) {
    try {
        const groupJid = m.key?.remoteJid
        if (!groupJid || !groupJid.endsWith('@g.us')) return false
        if (m.key?.fromMe) return false

        const senderJid = m.key?.participant || m.key?.remoteJid

        // Owners globales y admins del grupo están exentos
        if (isOwnerGlobal(senderJid)) return false
        if (isAdmin) return false

        // Si el bot no es admin no puede borrar — solo ejecutar antis que no requieren borrado
        // (anti-spam, anti-toxic, anti-badwords, anti-nsfw, anti-arab, anti-fake, anti-number, anti-tagall, anti-bot, anti-status)
        // Los que requieren borrado solo corren si isBotAdmin === true

        const msg = m.message || {}
        const tipo = Object.keys(msg)[0] || ''

        // ── Anti-Spam ──────────────────────────────────────────────
        if (isEnabled(groupJid, 'antiSpam')) {
            const { antiSpamDetector } = await import('./anti-spam.js')
            const blocked = await antiSpamDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Foto ──────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiFoto')) {
            if (tipo === 'imageMessage') {
                await deleteMsg(sock, m, groupJid, 'fotos no permitidas.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Sticker ───────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiSticker')) {
            if (tipo === 'stickerMessage') {
                await deleteMsg(sock, m, groupJid, 'stickers no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Video ─────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiVideo')) {
            if (tipo === 'videoMessage') {
                await deleteMsg(sock, m, groupJid, 'videos no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Audio (solo audios normales, no notas de voz) ─────
        if (isBotAdmin && isEnabled(groupJid, 'antiAudio')) {
            if (tipo === 'audioMessage' && !msg.audioMessage?.ptt) {
                await deleteMsg(sock, m, groupJid, 'audios no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Voz ───────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiVoice')) {
            if (tipo === 'audioMessage' && msg.audioMessage?.ptt === true) {
                await deleteMsg(sock, m, groupJid, 'notas de voz no permitidas.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Documento ─────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiDocument')) {
            if (tipo === 'documentMessage' || tipo === 'documentWithCaptionMessage') {
                await deleteMsg(sock, m, groupJid, 'documentos no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Reenvio ───────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiForward')) {
            const isForwarded =
                msg?.[tipo]?.contextInfo?.isForwarded === true ||
                (msg?.[tipo]?.contextInfo?.forwardingScore || 0) > 0
            if (isForwarded) {
                await deleteMsg(sock, m, groupJid, 'reenvios no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-ViewOnce ──────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiViewOnce')) {
            if (msg?.[tipo]?.viewOnce === true) {
                await deleteMsg(sock, m, groupJid, 'mensajes de una sola vista no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Contacto ──────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiContact')) {
            if (tipo === 'contactMessage' || tipo === 'contactsArrayMessage') {
                await deleteMsg(sock, m, groupJid, 'contactos no permitidos.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Ubicacion ─────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiLocation')) {
            if (tipo === 'locationMessage' || tipo === 'liveLocationMessage') {
                await deleteMsg(sock, m, groupJid, 'ubicaciones no permitidas.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Encuesta ──────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiPoll')) {
            if (
                tipo === 'pollCreationMessage' ||
                tipo === 'pollCreationMessageV2' ||
                tipo === 'pollCreationMessageV3'
            ) {
                await deleteMsg(sock, m, groupJid, 'encuestas no permitidas.', senderJid, isBotAdmin)
                return true
            }
        }

        // ── Anti-Link básico ───────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiLink')) {
            const { antiLinkDetector } = await import('./anti-link.js')
            const blocked = await antiLinkDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Toxico ────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiToxic')) {
            const { antiToxicDetector } = await import('./anti-toxic.js')
            const blocked = await antiToxicDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Palabras ──────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiBadWords')) {
            const { antiBadWordsDetector } = await import('./anti-badwords.js')
            const blocked = await antiBadWordsDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-NSFW ──────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiNsfw')) {
            const { antiNsfwDetector } = await import('./anti-nsfw.js')
            const blocked = await antiNsfwDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Arabe ─────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiArab')) {
            const { antiArabDetector } = await import('./anti-arab.js')
            const blocked = await antiArabDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Fake ──────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiFake')) {
            const { antiFakeDetector } = await import('./anti-fake.js')
            const blocked = await antiFakeDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Numero ────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiNumber')) {
            const { antiNumberDetector } = await import('./anti-number.js')
            const blocked = await antiNumberDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-TagAll ────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiTagAll')) {
            const { antiTagAllDetector } = await import('./anti-tagall.js')
            const blocked = await antiTagAllDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Bot ───────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiBot')) {
            const { antiBotDetector } = await import('./anti-bot.js')
            const blocked = await antiBotDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        // ── Anti-Status ────────────────────────────────────────────
        if (isBotAdmin && isEnabled(groupJid, 'antiStatus')) {
            const { antiStatusDetector } = await import('./anti-status.js')
            const blocked = await antiStatusDetector(sock, m, isBotAdmin)
            if (blocked) return true
        }

        return false
    } catch {
        return false
    }
}

// ══════════════════════════════════════════════════════════════════
// DETECTOR DE ELIMINACIONES — llamado desde loader.js
// No necesita isBotAdmin: solo NOTIFICA (no borra), el bot puede
// enviar mensajes aunque no sea admin
// ══════════════════════════════════════════════════════════════════
export async function antiDeleteDetectorMaster(sock, m) {
    try {
        const groupJid = m.key?.remoteJid
        if (!groupJid || !groupJid.endsWith('@g.us')) return false
        if (!isEnabled(groupJid, 'antiDelete')) return false

        const msg = m.message
        if (!msg?.protocolMessage) return false
        // type 0 = revoke (eliminación de mensaje)
        if (msg.protocolMessage.type !== 0) return false

        // No notificar si el bot mismo elimina
        if (m.key?.fromMe) return false

        const senderJid = m.key?.participant || m.key?.remoteJid
        const num = cleanNum(senderJid)

        await sock.sendMessage(groupJid, {
            text: `🗑️ @${num} intentó eliminar un mensaje.`,
            mentions: [senderJid]
        })
        return true
    } catch {
        return false
    }
}

// ══════════════════════════════════════════════════════════════════
// DETECTOR DE LLAMADAS — llamado desde loader.js con evento 'call'
// No es de grupo, solo rechaza la llamada al caller
// ══════════════════════════════════════════════════════════════════
export async function antiCallDetectorMaster(sock, callData) {
    try {
        if (!callData || !Array.isArray(callData) || !callData.length) return false
        const call = callData[0]

        const callerJid = call.from || call.id
        if (!callerJid) return false

        // Revisar si hay ALGÚN grupo con antiCall activado
        const db = loadDb()
        const antiCallActive = Object.values(db).some(cfg => cfg?.antiCall === true)
        if (!antiCallActive) return false

        try {
            await sock.rejectCall(call.id, call.from)
            const num = cleanNum(callerJid)
            await sock.sendMessage(callerJid, {
                text: `📞 @${num} las llamadas no están permitidas. La llamada fue rechazada automáticamente.`,
                mentions: [callerJid]
            })
        } catch {}

        return true
    } catch {
        return false
    }
}
