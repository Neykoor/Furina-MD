import './src/database/config.js'
import { start } from './lib/connection.js'

start().catch(err => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
})
