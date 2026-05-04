let handler = async (m, { conn, text, command, usedPrefix }) => {
    const userId = m.sender
    
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {}
    
    if (command === 'setpack' || command === 'sp') {
        if (!text) return conn.reply(m.chat, 
            `✏️ *Configurar Pack de Stickers*\n\n` +
            `Uso: \`${usedPrefix}setpack NombrePack | Autor\`\n` +
            `Ejemplo: \`${usedPrefix}setpack MiBot | Fernando\``, m)
        
        const [pack, author] = text.split('|').map(p => p.trim())
        
        global.db.data.users[userId].text1 = pack || global.packsticker
        global.db.data.users[userId].text2 = author || global.packsticker2
        
        return conn.reply(m.chat, 
            `✅ *Pack configurado*\n\n` +
            `📦 Pack: ${global.db.data.users[userId].text1}\n` +
            `👤 Autor: ${global.db.data.users[userId].text2}`, m)
    }
    
    if (command === 'delpack' || command === 'dp') {
        delete global.db.data.users[userId].text1
        delete global.db.data.users[userId].text2
        return conn.reply(m.chat, `✅ *Pack restaurado a valores por defecto*`, m)
    }
}

handler.tags = ['sticker']
handler.help = ['setpack <pack | autor>', 'delpack']
handler.command = ['setpack', 'sp', 'delpack', 'dp']

export default handler
