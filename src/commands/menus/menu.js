//      src/commands/info/menu.js
//  Menú interactivo avanzado de Asta Bot
//  Usa interactiveMessage con nativeFlowMessage para mezclar botones

import { prepareWAMessageMedia } from '@whiskeysockets/baileys'

let handler = async (m, { conn, usedPrefix, command }) => {
    const userJid = m.sender
    const userId = userJid.split('@')[0].replace(/\D/g, '')

    const sock = conn
    const subConfig = sock.subConfig || {}
    const botName = subConfig.name || global.namebot || '『𝕬𝖘𝖙𝖆-𝕭𝖔𝖙』'
    const logoMenu = subConfig.logos?.menu || global.icono || global.logo || ''
    const prefix = usedPrefix || global.prefix || '.'

    // ═══════════════════════════════════════════════════════════
    //  CONFIGURACIÓN DE ENLACES (desde tu config.js)
    // ═══════════════════════════════════════════════════════════
    const WEB_URL = global.publicURL || global.github || 'https://github.com/Fer2809fl/asta-.git'
    const CHANNEL_URL = global.channel || 'https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21'
    const GRUPO_URL = global.grupo || 'https://chat.whatsapp.com/CErS5aOt9Ws61C9UpFPzdC'

    // ═══════════════════════════════════════════════════════════
    //  TEXTO PRINCIPAL DEL MENÚ
    // ═══════════════════════════════════════════════════════════
    const caption = `╔══════════════════════╗
║  🤖 *${botName}*  ║
╚══════════════════════╝

👋 ¡Hola @${userId}!

✨ *Selecciona una opción del menú* desplegable para ver los comandos disponibles.

📌 *Consejo:* También puedes usar *${prefix}menu-economia*, *${prefix}menu-rpg*, etc.`

    // ═══════════════════════════════════════════════════════════
    //  BOTONES DEL MENÚ DESPLEGABLE (single_select)
    // ═══════════════════════════════════════════════════════════
    const menuSections = [
        {
            title: '📂 Información',
            highlight_label: 'INFO',
            rows: [
                { header: '🏓', title: 'Ping', description: 'Velocidad del bot', id: `${prefix}ping` },
                { header: 'ℹ️', title: 'Info del Bot', description: 'Información general', id: `${prefix}info` },
                { header: '👤', title: 'Mi Perfil', description: 'Tu perfil completo', id: `${prefix}perfil` }
            ]
        },
        {
            title: '💰 Economía',
            highlight_label: 'ECON',
            rows: [
                { header: '💵', title: 'Menú Economía', description: 'Comandos de economía', id: `${prefix}menu-economia` },
                { header: '💼', title: 'Trabajar', description: 'Gana dinero trabajando', id: `${prefix}work` },
                { header: '🎰', title: 'Ruleta', description: 'Apuesta tu dinero', id: `${prefix}ruleta` }
            ]
        },
        {
            title: '🎮 Juegos & RPG',
            highlight_label: 'GAME',
            rows: [
                { header: '🎰', title: 'Menú Gacha', description: 'Sistema Gacha', id: `${prefix}menu-gacha` },
                { header: '⚔️', title: 'Menú RPG', description: 'Rol y aventuras', id: `${prefix}menu-rpg` },
                { header: '🎲', title: 'Menú Juegos', description: 'Minijuegos divertidos', id: `${prefix}menu-games` }
            ]
        },
        {
            title: '👥 Grupos',
            highlight_label: 'GRP',
            rows: [
                { header: '⚙️', title: 'Menú Grupo', description: 'Configuración de grupos', id: `${prefix}menu-grupo` },
                { header: '🔗', title: 'Anti-Link', description: 'Protección de enlaces', id: `${prefix}antilink` },
                { header: '👑', title: 'Admin Tools', description: 'Herramientas de admin', id: `${prefix}menu-admin` }
            ]
        },
        {
            title: '🔧 Herramientas',
            highlight_label: 'TOOLS',
            rows: [
                { header: '📥', title: 'Descargas', description: 'YouTube, TikTok, etc.', id: `${prefix}menudes` },
                { header: '🖼️', title: 'Sticker', description: 'Crear stickers', id: `${prefix}sticker` },
                { header: '🤖', title: 'IA / ChatGPT', description: 'Inteligencia artificial', id: `${prefix}ia` }
            ]
        },
        {
            title: '🌐 Extras',
            highlight_label: 'MORE',
            rows: [
                { header: '📢', title: 'Canal Oficial', description: 'Únete a nuestro canal', id: `${prefix}canal` },
                { header: '👑', title: 'Owner', description: 'Contactar al creador', id: `${prefix}owner` },
                { header: '❓', title: 'Ayuda', description: 'Cómo usar el bot', id: `${prefix}help` }
            ]
        }
    ]

    // ═══════════════════════════════════════════════════════════
    //  BOTONES INFERIORES (3 botones fijos debajo del menú)
    // ═══════════════════════════════════════════════════════════
    //  1. CTA_URL → GitHub/Web del bot
    //  2. CTA_URL → Canal del bot  
    //  3. QUICK_REPLY → Pedir ser subbot (.code)
    // ═══════════════════════════════════════════════════════════

    try {
        let media = null

        // Preparar imagen si hay logo disponible
        if (logoMenu && logoMenu.startsWith('http')) {
            try {
                media = await prepareWAMessageMedia(
                    { image: { url: logoMenu } },
                    { upload: conn.waUploadToServer }
                )
            } catch (e) {
                console.error('[menu] Error preparando imagen:', e.message)
            }
        }

        // Construir el mensaje interactivo
        const interactiveMessage = {
            body: { text: caption },
            footer: { text: `✨ ${botName} © 2024 | Usa ${prefix}menu para volver` },
            header: media ? {
                hasMediaAttachment: true,
                imageMessage: media.imageMessage
            } : {
                hasMediaAttachment: false,
                title: `🤖 ${botName}`,
                subtitle: 'Menú Principal'
            },
            nativeFlowMessage: {
                buttons: [
                    // ─── BOTÓN 1: LISTA DESPLEGABLE ───
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📚 Ver Comandos',
                            sections: menuSections
                        })
                    },
                    // ─── BOTÓN 2: URL A GITHUB/WEB ───
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🌐 GitHub',
                            url: WEB_URL
                        })
                    },
                    // ─── BOTÓN 3: URL AL CANAL ───
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📢 Canal Oficial',
                            url: CHANNEL_URL
                        })
                    },
                    // ─── BOTÓN 4: QUICK REPLY → SER SUBBOT (.code) ───
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🤖 Ser Sub-Bot',
                            id: `${prefix}code`
                        })
                    }
                ]
            }
        }

        // Enviar mensaje interactivo
        await conn.relayMessage(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage
                }
            }
        }, { quoted: m })

    } catch (error) {
        console.error('[menu] Error enviando menú interactivo:', error.message)

        // ═══════════════════════════════════════════════════
        //  FALLBACK: Menú de texto plano si falla el interactivo
        // ═══════════════════════════════════════════════════
        let fallbackTxt = `╔══════════════════════╗\n`
        fallbackTxt += `║  🤖 *${botName}*  ║\n`
        fallbackTxt += `╚══════════════════════╝\n\n`
        fallbackTxt += `👋 ¡Hola @${userId}!\n\n`

        fallbackTxt += `📂 *INFORMACIÓN*\n`
        fallbackTxt += `  ${prefix}ping - Velocidad del bot\n`
        fallbackTxt += `  ${prefix}info - Información del bot\n`
        fallbackTxt += `  ${prefix}perfil - Tu perfil completo\n\n`

        fallbackTxt += `💰 *ECONOMÍA*\n`
        fallbackTxt += `  ${prefix}menu-economia - Menú de economía\n\n`

        fallbackTxt += `🎮 *JUEGOS Y RPG*\n`
        fallbackTxt += `  ${prefix}menu-gacha - Menú Gacha\n`
        fallbackTxt += `  ${prefix}menu-rpg - Menú RPG\n\n`

        fallbackTxt += `👥 *GRUPOS*\n`
        fallbackTxt += `  ${prefix}menu-grupo - Menú de grupo\n\n`

        fallbackTxt += `🔧 *HERRAMIENTAS*\n`
        fallbackTxt += `  ${prefix}menudes - Menú descargas\n`
        fallbackTxt += `  ${prefix}sticker - Crear sticker\n\n`

        fallbackTxt += `🌐 *ENLACES*\n`
        fallbackTxt += `  🌐 GitHub: ${WEB_URL}\n`
        fallbackTxt += `  📢 Canal: ${CHANNEL_URL}\n`
        fallbackTxt += `  🤖 Ser Sub-Bot: ${prefix}code\n\n`

        fallbackTxt += `📝 *${prefix}menu* - Menú principal`

        try {
            if (logoMenu && logoMenu.startsWith('http')) {
                await conn.sendMessage(m.chat, { 
                    image: { url: logoMenu }, 
                    caption: fallbackTxt, 
                    mentions: [userJid] 
                }, { quoted: m })
            } else {
                await conn.sendMessage(m.chat, { 
                    text: fallbackTxt, 
                    mentions: [userJid] 
                }, { quoted: m })
            }
        } catch {
            await conn.sendMessage(m.chat, { 
                text: fallbackTxt, 
                mentions: [userJid] 
            }, { quoted: m })
        }
    }
}

handler.help = ['menu', 'help', 'comandos', 'ayuda']
handler.tags = ['info', 'main']
handler.command = ['menu', 'help', 'comandos', 'ayuda']

export default handler
