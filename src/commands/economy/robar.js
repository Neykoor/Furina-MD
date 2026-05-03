import { getOrCreateUser, updateUser } from '../../../lib/users.js'

let handler = async (m, { conn, args }) => {
    const userId = m.sender.split('@')[0].replace(/\D/g, '')
    const user = getOrCreateUser(userId)

    // Cooldown: 30 minutos entre crímenes
    const now = Date.now()
    const cooldown = 30 * 60 * 1000 // 30 minutos
    const lastCrime = user.lastCrime || 0

    if (now - lastCrime < cooldown) {
        const tiempoRestante = Math.ceil((cooldown - (now - lastCrime)) / 60000)
        return conn.reply(m.chat, `⏳ *¡La policía está vigilando!*\n\nEspera *${tiempoRestante}* minutos antes de cometer otro crimen.\n\n🕐 Último crimen: ${new Date(lastCrime).toLocaleTimeString('es-MX')}`, m)
    }

    // Tipos de crímenes con probabilidades y recompensas/riesgos
    const crimenes = [
        { nombre: '💰 Robar una tienda', probExito: 0.60, minGanancia: 500, maxGanancia: 2500, multa: 1000, textoExito: 'Entraste sigilosamente y vaciaste la caja registradora', textoFallo: 'La alarma sonó y la policía te atrapó' },
        { nombre: '🏧 Hackear un cajero', probExito: 0.45, minGanancia: 1000, maxGanancia: 5000, multa: 2000, textoExito: 'Lograste bypassear el sistema de seguridad', textoFallo: 'El banco detectó la intrusión y bloqueó tus cuentas' },
        { nombre: '🚗 Robar un coche', probExito: 0.50, minGanancia: 800, maxGanancia: 3500, multa: 1500, textoExito: 'Conseguiste vender las piezas en el mercado negro', textoFallo: 'El dueño tenía GPS y la policía te encontró' },
        { nombre: '💎 Asaltar una joyería', probExito: 0.35, minGanancia: 2000, maxGanancia: 8000, multa: 3000, textoExito: 'Escapaste con las joyas más valiosas', textoFallo: 'Los guardias de seguridad te redujeron' },
        { nombre: '🏠 Estafar por internet', probExito: 0.70, minGanancia: 300, maxGanancia: 1500, multa: 800, textoExito: 'La víctima cayó en el phishing perfecto', textoFallo: 'Te reportaron y perdiste tu cuenta falsa' },
        { nombre: '🎰 Timar en el casino', probExito: 0.40, minGanancia: 1500, maxGanancia: 6000, multa: 2500, textoExito: 'Contaste cartas como un profesional', textoFallo: 'El dealer te descubrió y te sacaron a patadas' }
    ]

    // Si el usuario especifica un crimen
    let crimen
    if (args[0]) {
        const index = parseInt(args[0]) - 1
        if (index >= 0 && index < crimenes.length) {
            crimen = crimenes[index]
        } else {
            let lista = crimenes.map((c, i) => `${i + 1}. ${c.nombre} (💰${c.minGanancia.toLocaleString()}-${c.maxGanancia.toLocaleString()})`).join('\n')
            return conn.reply(m.chat, `❌ *Crimen no válido*\n\n📋 *Lista de crímenes disponibles:*\n${lista}\n\n📝 *Uso:* #crimen [número]\nEjemplo: #crimen 3`, m)
        }
    } else {
        // Crimen aleatorio
        crimen = crimenes[Math.floor(Math.random() * crimenes.length)]
    }

    // Ejecutar el crimen
    const exito = Math.random() < crimen.probExito
    let resultado = ''
    let ganancia = 0
    let expGanada = 0

    if (exito) {
        ganancia = Math.floor(Math.random() * (crimen.maxGanancia - crimen.minGanancia + 1)) + crimen.minGanancia
        expGanada = Math.floor(ganancia / 100)

        // Actualizar usuario
        user.money = (user.money || 0) + ganancia
        user.exp = (user.exp || 0) + expGanada
        user.lastCrime = now
        user.crimesSuccess = (user.crimesSuccess || 0) + 1

        // Subir de nivel si alcanza la exp necesaria
        const expNeeded = (user.level || 1) * 100
        if (user.exp >= expNeeded) {
            user.level = (user.level || 1) + 1
            user.exp = user.exp - expNeeded
            resultado += `\n\n🎉 *¡SUBISTE DE NIVEL!*\n⭐ Nivel: ${user.level}`
        }

        updateUser(userId, user)

        resultado = `✅ *¡CRIMEN EXITOSO!*\n\n${crimen.textoExito}\n\n💰 *Ganancia:* +$${ganancia.toLocaleString()}\n✨ *Exp:* +${expGanada}\n💵 *Efectivo actual:* $${user.money.toLocaleString()}` + resultado

        await conn.sendMessage(m.chat, {
            text: resultado,
            contextInfo: {
                externalAdReply: {
                    title: '🦹‍♂️ CRIMEN EXITOSO',
                    body: `Ganaste $${ganancia.toLocaleString()}`,
                    thumbnailUrl: global.icono || 'https://i.imgur.com/8QBYRrm.jpg',
                    sourceUrl: global.canal || 'https://whatsapp.com'
                }
            }
        }, { quoted: m })

    } else {
        // Fracaso: pierde dinero o va a la cárcel
        const dineroActual = user.money || 0
        const multa = Math.min(crimen.multa, dineroActual) // No puede quedar en negativo

        user.money = dineroActual - multa
        user.lastCrime = now
        user.crimesFail = (user.crimesFail || 0) + 1

        updateUser(userId, user)

        resultado = `❌ *¡CRIMEN FALLIDO!*\n\n${crimen.textoFallo}\n\n💸 *Multa:* -$${multa.toLocaleString()}\n💵 *Efectivo actual:* $${user.money.toLocaleString()}\n\n🚔 *La policía te tiene en la mira...*`

        await conn.sendMessage(m.chat, {
            text: resultado,
            contextInfo: {
                externalAdReply: {
                    title: '🚔 CRIMEN FALLIDO',
                    body: `Perdiste $${multa.toLocaleString()}`,
                    thumbnailUrl: global.icono || 'https://i.imgur.com/8QBYRrm.jpg',
                    sourceUrl: global.canal || 'https://whatsapp.com'
                }
            }
        }, { quoted: m })
    }
}

handler.help = ['crimen']
handler.tags = ['economy', 'rpg']
handler.command = ['crimen', 'crime', 'robar', 'steal']
handler.cooldown = 30 * 60 // 30 minutos en segundos (backup)
export default handler