import { Pokemon } from './lib/pokemon.js'
import { getTypeEmoji, initUser, isInAnyBattle } from './lib/utils.js'

const ITEMS_PER_PAGE = 10

let handler = async (m, { conn, usedPrefix, args, command }) => {
    // Bloquear si está en batalla
    if (isInAnyBattle(m.sender)) {
        return m.reply(`❌ No puedes ver tu caja mientras estás en una batalla.`)
    }

    const u = initUser(m.sender, m.pushName), box = u.pokemonV1.box

    // Detalle individual (pokemonbox)
    if (['pokemonbox', 'pokebox'].includes(command) && args[0]) {
        if (!box.length) return m.reply('❌ Caja vacía')
        const idx = parseInt(args[0]) - 1
        if (isNaN(idx) || idx < 0 || idx >= box.length) return m.reply(`❌ Número inválido (1-${box.length})`)
        const p = Pokemon.fromJSON(box[idx])
        const text = `📦 *${p.shiny ? '✨ ' : ''}${p.displayName}* (#${p.id})\n${'═'.repeat(25)}\n🎖️ Nivel: ${p.level}\n🔸 Tipo: ${p.types.map(t => getTypeEmoji(t)).join(' ')} ${p.types.join('/')}\n❤️ ${p.getHpBar()}\n⚔️ ATK: ${p.stats.attack} | 🛡️ DEF: ${p.stats.defense}\n📍 Caja #${idx + 1}\n📅 ${new Date(p.caughtAt).toLocaleDateString()}\n💡 *${usedPrefix}box* para ver lista`
        try {
            await conn.sendMessage(m.chat, { image: { url: p.artwork || p.sprite }, caption: text })
        } catch {
            await m.reply(text)
        }
        return
    }

    // Lista paginada
    if (!box.length) return m.reply(`📦 *CAJA VACÍA*\n\nUsa *${usedPrefix}wild* para capturar Pokémon.`)
    const page = Math.min(Math.max(parseInt(args[0]) || 1, 1), Math.ceil(box.length / ITEMS_PER_PAGE))
    const start = (page - 1) * ITEMS_PER_PAGE, pageItems = box.slice(start, start + ITEMS_PER_PAGE)
    let text = `📦 *CAJA* - ${page}/${Math.ceil(box.length / ITEMS_PER_PAGE)}\n${'═'.repeat(35)}\nTotal: ${box.length} | Equipo: ${u.pokemonV1.team.length}/6\n\n`
    text += pageItems.map((p, i) => `${start + i + 1}. ${p.shiny ? '✨ ' : ''}${p.displayName} (Nv.${p.level}) ${p.types.map(t => getTypeEmoji(t)).join('')}`).join('\n')
    if (Math.ceil(box.length / ITEMS_PER_PAGE) > 1) text += `\n\n📄 ${page > 1 ? `*${usedPrefix}box ${page - 1}* ← ` : ''}${page < Math.ceil(box.length / ITEMS_PER_PAGE) ? `→ *${usedPrefix}box ${page + 1}*` : ''}`
    text += `\n${'═'.repeat(35)}\n📋 *${usedPrefix}pokemonbox [n]* | *${usedPrefix}release box [n]*`
    await m.reply(text)
}

handler.help = ['box', 'pokemonbox']
handler.tags = ['pokemon-v1']
handler.command = ['box', 'caja', 'pokemonbox', 'pokebox']
handler.group = true

export default handler