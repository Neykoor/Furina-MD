let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return conn.reply(m.chat, 
            `🧮 *Calculadora*\n\nUso: ${usedPrefix + command} <operacion>\nEjemplos:\n${usedPrefix + command} 10 + 5\n${usedPrefix + command} 100 * 2\n${usedPrefix + command} 50 / 2`, m)
    }
    
    const expr = args.join(' ')
    try {
        const clean = expr.replace(/[^0-9+\-*/().\s]/g, '')
        const result = Function('"use strict"; return (' + clean + ')')()
        conn.reply(m.chat, `🧮 *Resultado*\n\n📥 ${expr}\n📤 ${result}`, m)
    } catch {
        conn.reply(m.chat, `❌ *Operacion invalida*`, m)
    }
}

handler.tags = ['tools']
handler.help = ['calc']
handler.command = ['calc', 'calculadora']


export default handler
