import fs from 'fs'
import path from 'path'

const ANTI_DB = path.join(process.cwd(), 'data', 'anti-config.json')

function loadDb() {
    if (!fs.existsSync(ANTI_DB)) return {}
    return JSON.parse(fs.readFileSync(ANTI_DB, 'utf-8'))
}

function isEnabled(jid, key) {
    return loadDb()[jid]?.[key] === true
}

function cleanNum(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
}

async function getPerms(sock, groupJid, senderJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid)
        const participants = metadata.participants || []
        const senderNum = cleanNum(senderJid)
        const botJid = sock.user?.jid || sock.user?.id || ''
        const botNum = cleanNum(botJid)

        const userP = participants.find(p => cleanNum(p.id) === senderNum)
        const botP = participants.find(p => cleanNum(p.id) === botNum)

        return {
            isAdmin: userP?.admin === 'admin' || userP?.admin === 'superadmin',
            isBotAdmin: botP?.admin === 'admin' || botP?.admin === 'superadmin',
            isOwner: (global.owner || []).some(o => {
                const oNum = cleanNum(Array.isArray(o) ? o[0] : o)
                return oNum === senderNum
            })
        }
    } catch {
        return { isAdmin: false, isBotAdmin: false, isOwner: false }
    }
}

async function deleteMsg(sock, msg, groupJid, reason, userJid) {
    try {
        await sock.sendMessage(groupJid, { delete: msg.key })
        const num = cleanNum(userJid)
        await sock.sendMessage(groupJid, {
            text: `🛡️ @${num} ${reason}`,
            mentions: [userJid]
        })
    } catch {}
}

export async function antiMasterDetector(sock, m) {
    try {
        const groupJid = m.key?.remoteJid
        if (!groupJid || !groupJid.endsWith('@g.us')) return false
        if (m.key?.fromMe) return false

        const senderJid = m.key?.participant || m.key?.remoteJid
        const perms = await getPerms(sock, groupJid, senderJid)
        if (perms.isOwner) return false

        const msg = m.message || {}
        const tipo = Object.keys(msg)[0]
        const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || ''
        const senderNum = cleanNum(senderJid)

        // Anti-Spam
        if (isEnabled(groupJid, 'antiSpam')) {
            if (!perms.isAdmin) {
                const { antiSpamDetector } = await import('./anti-spam.js')
                const blocked = await antiSpamDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Foto
        if (isEnabled(groupJid, 'antiFoto')) {
            if (!perms.isAdmin && tipo === 'imageMessage') {
                await deleteMsg(sock, m, groupJid, 'fotos no permitidas.', senderJid)
                return true
            }
        }

        // Anti-Sticker
        if (isEnabled(groupJid, 'antiSticker')) {
            if (!perms.isAdmin && tipo === 'stickerMessage') {
                await deleteMsg(sock, m, groupJid, 'stickers no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Video
        if (isEnabled(groupJid, 'antiVideo')) {
            if (!perms.isAdmin && tipo === 'videoMessage') {
                await deleteMsg(sock, m, groupJid, 'videos no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Audio
        if (isEnabled(groupJid, 'antiAudio')) {
            if (!perms.isAdmin && tipo === 'audioMessage') {
                await deleteMsg(sock, m, groupJid, 'audios no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Voz
        if (isEnabled(groupJid, 'antiVoice')) {
            if (!perms.isAdmin && tipo === 'audioMessage' && msg.audioMessage?.ptt === true) {
                await deleteMsg(sock, m, groupJid, 'notas de voz no permitidas.', senderJid)
                return true
            }
        }

        // Anti-Documento
        if (isEnabled(groupJid, 'antiDocument')) {
            if (!perms.isAdmin && tipo === 'documentMessage') {
                await deleteMsg(sock, m, groupJid, 'documentos no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Reenvio
        if (isEnabled(groupJid, 'antiForward')) {
            if (!perms.isAdmin && (msg.extendedTextMessage?.contextInfo?.isForwarded || msg.conversation?.includes('Forwarded'))) {
                await deleteMsg(sock, m, groupJid, 'reenvios no permitidos.', senderJid)
                return true
            }
        }

        // Anti-ViewOnce
        if (isEnabled(groupJid, 'antiViewOnce')) {
            if (!perms.isAdmin && msg?.[tipo]?.viewOnce === true) {
                await deleteMsg(sock, m, groupJid, 'mensajes de una sola vista no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Contacto
        if (isEnabled(groupJid, 'antiContact')) {
            if (!perms.isAdmin && tipo === 'contactMessage') {
                await deleteMsg(sock, m, groupJid, 'contactos no permitidos.', senderJid)
                return true
            }
        }

        // Anti-Ubicacion
        if (isEnabled(groupJid, 'antiLocation')) {
            if (!perms.isAdmin && (tipo === 'locationMessage' || tipo === 'liveLocationMessage')) {
                await deleteMsg(sock, m, groupJid, 'ubicaciones no permitidas.', senderJid)
                return true
            }
        }

        // Anti-Encuesta
        if (isEnabled(groupJid, 'antiPoll')) {
            if (!perms.isAdmin && tipo === 'pollCreationMessage') {
                await deleteMsg(sock, m, groupJid, 'encuestas no permitidas.', senderJid)
                return true
            }
        }

        // Anti-Toxico
        if (isEnabled(groupJid, 'antiToxic')) {
            if (!perms.isAdmin) {
                const { antiToxicDetector } = await import('./anti-toxic.js')
                const blocked = await antiToxicDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Palabras
        if (isEnabled(groupJid, 'antiBadWords')) {
            if (!perms.isAdmin) {
                const { antiBadWordsDetector } = await import('./anti-badwords.js')
                const blocked = await antiBadWordsDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-NSFW
        if (isEnabled(groupJid, 'antiNsfw')) {
            if (!perms.isAdmin) {
                const { antiNsfwDetector } = await import('./anti-nsfw.js')
                const blocked = await antiNsfwDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Arabe
        if (isEnabled(groupJid, 'antiArab')) {
            if (!perms.isAdmin) {
                const { antiArabDetector } = await import('./anti-arab.js')
                const blocked = await antiArabDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Fake
        if (isEnabled(groupJid, 'antiFake')) {
            if (!perms.isAdmin) {
                const { antiFakeDetector } = await import('./anti-fake.js')
                const blocked = await antiFakeDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Numero
        if (isEnabled(groupJid, 'antiNumber')) {
            if (!perms.isAdmin) {
                const { antiNumberDetector } = await import('./anti-number.js')
                const blocked = await antiNumberDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-TagAll
        if (isEnabled(groupJid, 'antiTagAll')) {
            if (!perms.isAdmin) {
                const { antiTagAllDetector } = await import('./anti-tagall.js')
                const blocked = await antiTagAllDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Bot
        if (isEnabled(groupJid, 'antiBot')) {
            if (!perms.isAdmin) {
                const { antiBotDetector } = await import('./anti-bot.js')
                const blocked = await antiBotDetector(sock, m)
                if (blocked) return true
            }
        }

        // Anti-Status
        if (isEnabled(groupJid, 'antiStatus')) {
            if (!perms.isAdmin) {
                const { antiStatusDetector } = await import('./anti-status.js')
                const blocked = await antiStatusDetector(sock, m)
                if (blocked) return true
            }
        }

        return false
    } catch (e) {
        return false
    }
}
