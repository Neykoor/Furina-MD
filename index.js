import './src/database/config.js'
import { start } from './lib/connection.js'
import { autoStartSubBots } from './lib/serbot.js'

start().catch(err => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
})

autoStartSubBots().catch(console.error)

import('./lib/web.js').catch(err => {
    console.error('❌ Error iniciando web:', err)
})
