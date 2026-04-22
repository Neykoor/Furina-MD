import './src/database/config.js'
import { start } from './lib/connection.js'
import { autoStartSubBots } from './lib/serbot.js'

// Iniciar bot principal
start().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})

// Auto-iniciar sub-bots guardados
autoStartSubBots().catch(console.error)

// Iniciar servidor web
import('./lib/web.js').catch(err => {
  console.error('❌ Error iniciando web:', err)
})
