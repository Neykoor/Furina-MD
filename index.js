import './src/database/config.js'
import { downloadYtDlp } from './lib/yt-dlp-downloader.js'
import { start } from './lib/connection.js'
import { autoStartSubBots } from './lib/serbot.js'

try {
    global.ytDlpPath = await downloadYtDlp()
    console.log(`✅ Descargas listas: ${global.ytDlpPath}`)
} catch (error) {
    console.error('❌ Descargas fallaron:', error.message)
    global.ytDlpPath = null
}

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
