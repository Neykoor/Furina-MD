import fs from 'fs'
import path from 'path'

const ANTI_DB = path.join(process.cwd(), 'data', 'anti-config.json')

function loadDb() {
    if (!fs.existsSync(ANTI_DB)) return {}
    try { return JSON.parse(fs.readFileSync(ANTI_DB, 'utf-8')) } catch { return {} }
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

    if (!m.isAdmin && !m.isOwner) {
        return conn.sendMessage(m.chat, { text: '🛡️ Solo admins pueden usar este comando.' }, { quoted: m })
    }

    if (!m.isBotAdmin) {
        return conn.sendMessage(m.chat, { text: '🤖 Necesito ser admin para moderar.' }, { quoted: m })
    }

    const sub = args[0]?.toLowerCase()
    const state = args[1]?.toLowerCase()

    const features = [
        { aliases: ['spam'], name: 'Anti-Spam', key: 'antiSpam', emoji: '📵', desc: 'Elimina spam masivo (5+ msgs/min)' },
        { aliases: ['foto', 'fotos'], name: 'Anti-Foto', key: 'antiFoto', emoji: '📷', desc: 'Elimina imágenes' },
        { aliases: ['sticker', 'stickers'], name: 'Anti-Sticker', key: 'antiSticker', emoji: '🎭', desc: 'Elimina stickers' },
        { aliases: ['fake', 'fakes'], name: 'Anti-Fake', key: 'antiFake', emoji: '🚫', desc: 'Elimina números de países no LATAM' },
        { aliases: ['delete', 'eliminar'], name: 'Anti-Delete', key: 'antiDelete', emoji: '🗑️', desc: 'Avisa cuando alguien elimina un mensaje' },
        { aliases: ['link', 'enlace', 'url'], name: 'Anti-Link', key: 'antiLink', emoji: '🔗', desc: 'Elimina enlaces (básico, sin advertencias)' },
        { aliases: ['video', 'videos'], name: 'Anti-Video', key: 'antiVideo', emoji: '🎬', desc: 'Elimina videos' },
        { aliases: ['audio', 'audios'], name: 'Anti-Audio', key: 'antiAudio', emoji: '🎵', desc: 'Elimina audios (no notas de voz)' },
        { aliases: ['voice', 'voz'], name: 'Anti-Voz', key: 'antiVoice', emoji: '🎙️', desc: 'Elimina notas de voz' },
        { aliases: ['document', 'documento', 'doc'], name: 'Anti-Documento', key: 'antiDocument', emoji: '📄', desc: 'Elimina documentos/PDFs' },
        { aliases: ['forward', 'reenvio'], name: 'Anti-Reenvio', key: 'antiForward', emoji: '↪️', desc: 'Elimina mensajes reenviados' },
        { aliases: ['viewonce', 'veruna'], name: 'Anti-ViewOnce', key: 'antiViewOnce', emoji: '👁️', desc: 'Elimina fotos/videos de una sola vista' },
        { aliases: ['contact', 'contacto'], name: 'Anti-Contacto', key: 'antiContact', emoji: '👤', desc: 'Elimina tarjetas de contacto' },
        { aliases: ['location', 'ubicacion'], name: 'Anti-Ubicacion', key: 'antiLocation', emoji: '📍', desc: 'Elimina ubicaciones en vivo' },
        { aliases: ['poll', 'encuesta'], name: 'Anti-Encuesta', key: 'antiPoll', emoji: '📊', desc: 'Elimina encuestas' },
        { aliases: ['toxic', 'toxico'], name: 'Anti-Toxico', key: 'antiToxic', emoji: '🤬', desc: 'Elimina mensajes con insultos' },
        { aliases: ['palabra', 'badword', 'badwords'], name: 'Anti-Palabras', key: 'antiBadWords', emoji: '🔞', desc: 'Elimina palabras prohibidas' },
        { aliases: ['porn', 'porno', 'nsfw'], name: 'Anti-NSFW', key: 'antiNsfw', emoji: '🔞', desc: 'Elimina contenido sexual' },
        { aliases: ['arab', 'arabe'], name: 'Anti-Arabe', key: 'antiArab', emoji: '🇸🇦', desc: 'Elimina números árabes (+212, +213, etc)' },
        { aliases: ['numero', 'number'], name: 'Anti-Numero', key: 'antiNumber', emoji: '🔢', desc: 'Elimina mensajes con números de teléfono' },
        { aliases: ['tagall', 'tag'], name: 'Anti-TagAll', key: 'antiTagAll', emoji: '🔔', desc: 'Elimina menciones masivas (+10 personas)' },
        { aliases: ['call', 'llamada'], name: 'Anti-Llamada', key: 'antiCall', emoji: '📞', desc: 'Rechaza llamadas entrantes automáticamente' },
        { aliases: ['bot', 'bots'], name: 'Anti-Bot', key: 'antiBot', emoji: '🤖', desc: 'Elimina mensajes de otros bots' },
        { aliases: ['status', 'estado'], name: 'Anti-Status', key: 'antiStatus', emoji: '📢', desc: 'Elimina menciones de estados de WhatsApp' },
    ]

    const findFeature = (alias) => features.find(f => f.aliases.includes(alias))
    const feat = findFeature(sub)

    // Sin argumentos o protección no reconocida → mostrar menú
    if (!sub || !feat) {
        const list = features.map(f => {
            const status = getStatus(m.chat, f.key)
            return ` ${f.emoji} ${status} *${f.name}* — ${f.desc}`
        }).join('\n')

        return conn.sendMessage(m.chat, {
            text: `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n│     🛡️ *SISTEMA ANTI*     │\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n📋 *Protecciones disponibles:*\n${list}\n\n💡 *Uso:*\n${usedPrefix}anti <proteccion> on\n${usedPrefix}anti <proteccion> off\n\n*Ejemplos:*\n${usedPrefix}anti spam on\n${usedPrefix}anti foto off\n${usedPrefix}anti delete on\n${usedPrefix}anti fake on\n${usedPrefix}anti call on`
        }, { quoted: m })
    }

    const isOn = state === 'on' || state === '1' || state === 'true'
    const isOff = state === 'off' || state === '0' || state === 'false'

    // Solo el nombre de la protección sin on/off → mostrar estado actual
    if (!isOn && !isOff) {
        const status = isEnabled(m.chat, feat.key)
        return conn.sendMessage(m.chat, {
            text: `${feat.emoji} *${feat.name}*\n\nEstado: ${status ? '✅ Activado' : '❌ Desactivado'}\n\nUsa: ${usedPrefix}anti ${sub} on / off`
        }, { quoted: m })
    }

    setGroupConfig(m.chat, feat.key, isOn)

    const text = isOn
        ? `${feat.emoji} *${feat.name}* activado.\n\n📖 ${feat.desc}`
        : `${feat.emoji} *${feat.name}* desactivado.`

    return conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['anti']
handler.tags = ['group']
handler.command = ['anti', 'antigp', 'proteccion', 'protect']
handler.group = true
handler.admin = true
handler.botAdmin = false

export default handler
