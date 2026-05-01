import fs from 'fs'
import path from 'path'

const ANTI_DB = path.join(process.cwd(), 'data', 'anti-config.json')

function loadDb() {
    if (!fs.existsSync(ANTI_DB)) return {}
    return JSON.parse(fs.readFileSync(ANTI_DB, 'utf-8'))
}

function saveDb(db) {
    fs.mkdirSync(path.dirname(ANTI_DB), { recursive: true })
    fs.writeFileSync(ANTI_DB, JSON.stringify(db, null, 2))
}

function getGroupConfig(jid) {
    const db = loadDb()
    if (!db[jid]) db[jid] = {}
    return db[jid]
}

function setGroupConfig(jid, key, value) {
    const db = loadDb()
    if (!db[jid]) db[jid] = {}
    db[jid][key] = value
    saveDb(db)
}

function isEnabled(jid, key) {
    return getGroupConfig(jid)[key] === true
}

function getStatus(jid, key) {
    return isEnabled(jid, key) ? '✅' : '❌'
}

let handler = async (m, { conn, args, usedPrefix }) => {
    if (!m.isGroup) {
        return conn.sendMessage(m.chat, { text: '👥 Este comando solo funciona en grupos.' }, { quoted: m })
    }

    if (!m.isAdmin) {
        return conn.sendMessage(m.chat, { text: '🛡️ Solo admins pueden usar este comando.' }, { quoted: m })
    }

    if (!m.isBotAdmin) {
        return conn.sendMessage(m.chat, { text: '🤖 Necesito ser admin para moderar.' }, { quoted: m })
    }

    const sub = args[0]?.toLowerCase()
    const state = args[1]?.toLowerCase()

    const features = [
        { aliases: ['spam'], name: 'Anti-Spam', key: 'antiSpam', emoji: '📵', desc: 'Elimina spam masivo (5+ msgs/min)' },
        { aliases: ['foto', 'fotos'], name: 'Anti-Foto', key: 'antiFoto', emoji: '📷', desc: 'Elimina imagenes' },
        { aliases: ['sticker', 'stickers'], name: 'Anti-Sticker', key: 'antiSticker', emoji: '🎭', desc: 'Elimina stickers' },
        { aliases: ['fake', 'fakes'], name: 'Anti-Fake', key: 'antiFake', emoji: '🚫', desc: 'Elimina numeros de paises falsos (+1, +44, etc)' },
        { aliases: ['delete', 'eliminar'], name: 'Anti-Delete', key: 'antiDelete', emoji: '🗑️', desc: 'Notifica cuando alguien elimina un mensaje' },
        { aliases: ['link', 'enlace', 'url'], name: 'Anti-Link', key: 'antiLink', emoji: '🔗', desc: 'Elimina enlaces de cualquier tipo' },
        { aliases: ['video', 'videos'], name: 'Anti-Video', key: 'antiVideo', emoji: '🎬', desc: 'Elimina videos' },
        { aliases: ['audio', 'audios'], name: 'Anti-Audio', key: 'antiAudio', emoji: '🎵', desc: 'Elimina audios' },
        { aliases: ['voice', 'voz'], name: 'Anti-Voz', key: 'antiVoice', emoji: '🎙️', desc: 'Elimina notas de voz' },
        { aliases: ['document', 'documento', 'doc'], name: 'Anti-Documento', key: 'antiDocument', emoji: '📄', desc: 'Elimina documentos/PDFs' },
        { aliases: ['forward', 'reenvio', 'reenviado'], name: 'Anti-Reenvio', key: 'antiForward', emoji: '↪️', desc: 'Elimina mensajes reenviados' },
        { aliases: ['viewonce', 'veruna'], name: 'Anti-ViewOnce', key: 'antiViewOnce', emoji: '👁️', desc: 'Elimina fotos/videos de una sola vista' },
        { aliases: ['contact', 'contacto'], name: 'Anti-Contacto', key: 'antiContact', emoji: '👤', desc: 'Elimina tarjetas de contacto' },
        { aliases: ['location', 'ubicacion', 'ubica'], name: 'Anti-Ubicacion', key: 'antiLocation', emoji: '📍', desc: 'Elimina ubicaciones en vivo' },
        { aliases: ['poll', 'encuesta'], name: 'Anti-Encuesta', key: 'antiPoll', emoji: '📊', desc: 'Elimina encuestas' },
        { aliases: ['toxic', 'toxico'], name: 'Anti-Toxico', key: 'antiToxic', emoji: '🤬', desc: 'Elimina mensajes con insultos' },
        { aliases: ['palabra', 'badword', 'badwords'], name: 'Anti-Palabras', key: 'antiBadWords', emoji: '🔞', desc: 'Elimina palabras prohibidas' },
        { aliases: ['porn', 'porno', 'nsfw'], name: 'Anti-NSFW', key: 'antiNsfw', emoji: '🔞', desc: 'Elimina contenido sexual' },
        { aliases: ['arab', 'arabe'], name: 'Anti-Arabe', key: 'antiArab', emoji: '🇸🇦', desc: 'Elimina numeros arabes (+212, +213, etc)' },
        { aliases: ['numero', 'number'], name: 'Anti-Numero', key: 'antiNumber', emoji: '🔢', desc: 'Elimina mensajes con numeros de telefono' },
        { aliases: ['tagall', 'tag'], name: 'Anti-TagAll', key: 'antiTagAll', emoji: '🔔', desc: 'Elimina menciones masivas (+10)' },
        { aliases: ['call', 'llamada'], name: 'Anti-Llamada', key: 'antiCall', emoji: '📞', desc: 'Rechaza llamadas entrantes' },
        { aliases: ['bot', 'bots'], name: 'Anti-Bot', key: 'antiBot', emoji: '🤖', desc: 'Elimina mensajes de otros bots' },
        { aliases: ['status', 'estado', 'statusmention'], name: 'Anti-Status', key: 'antiStatus', emoji: '📢', desc: 'Elimina menciones de estados' },
    ]

    const findFeature = (alias) => features.find(f => f.aliases.includes(alias))
    const feat = findFeature(sub)

    if (!sub || !feat) {
        const list = features.map(f => {
            const status = getStatus(m.chat, f.key)
            return ` ${f.emoji} ${status} *${f.name}* — ${f.desc}`
        }).join('
')

        return conn.sendMessage(m.chat, {
            text: `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│     🛡️ *SISTEMA ANTI*     │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📋 *Protecciones disponibles:*
${list}

💡 *Uso:*
${usedPrefix}anti <proteccion> on
${usedPrefix}anti <proteccion> off

*Ejemplos:*
${usedPrefix}anti spam on
${usedPrefix}anti foto off
${usedPrefix}anti sticker on
${usedPrefix}anti fake on
${usedPrefix}anti delete on
${usedPrefix}anti status on`
        }, { quoted: m })
    }

    const isOn = state === 'on' || state === '1' || state === 'true'
    const isOff = state === 'off' || state === '0' || state === 'false'

    if (!isOn && !isOff) {
        const status = getStatus(m.chat, feat.key)
        return conn.sendMessage(m.chat, {
            text: `${feat.emoji} *${feat.name}*

Estado: ${status === '✅' ? '✅ Activado' : '❌ Desactivado'}

Usa: ${usedPrefix}anti ${sub} on / off`
        }, { quoted: m })
    }

    setGroupConfig(m.chat, feat.key, isOn)

    const text = isOn 
        ? `${feat.emoji} *${feat.name}* activado.

${feat.desc}`
        : `${feat.emoji} *${feat.name}* desactivado.`

    return conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['anti']
handler.tags = ['group']
handler.command = ['anti', 'antigp', 'proteccion', 'protect']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
