import './src/database/config.js'
import { start } from './lib/connection.js'
import { autoStartSubBots } from './lib/serbot.js'

// ─── INICIAR BOT PRINCIPAL ───
start().catch(err => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
})

// ─── AUTO-INICIAR SUB-BOTS ───
autoStartSubBots().catch(console.error)

// ─── INICIAR SERVIDOR WEB ───
import('./lib/web.js').catch(err => {
    console.error('❌ Error iniciando web:', err)
})
