

import fs from 'fs'
import https from 'https'
import { platform } from 'os'
import { execSync } from 'child_process'

const BIN_DIR = './bin'

function getBinaryName() {
    return platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

function getBinaryPath() {
    return `${BIN_DIR}/${getBinaryName()}`
}

function getDownloadUrl() {
    const name = getBinaryName()
    return `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${name}`
}

export function checkYtDlp() {
    const binPath = getBinaryPath()
    
    if (fs.existsSync(binPath)) {
        try {
            const version = execSync(`"${binPath}" --version`, { encoding: 'utf-8', timeout: 5000 }).trim()
            console.log(`✅ yt-dlp encontrado: ${version}`)
            return binPath
        } catch {
            console.log('⚠️ yt-dlp existe pero no funciona, re-descargando...')
        }
    }
    
    try {
        const version = execSync('yt-dlp --version', { encoding: 'utf-8', timeout: 5000 }).trim()
        console.log(`✅ yt-dlp en PATH: ${version}`)
        return 'yt-dlp'
    } catch {
        // No está en PATH
    }
    
    return null
}

export async function downloadYtDlp() {
    const existing = checkYtDlp()
    if (existing) return existing
    
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true })
    
    console.log('📥 Descargando yt-dlp...')
    console.log(`   URL: ${getDownloadUrl()}`)
    
    const binPath = getBinaryPath()
    
    return new Promise((resolve, reject) => {
        https.get(getDownloadUrl(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (response) => {
            // Manejar redirect de GitHub (latest -> versión específica)
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location
                if (redirectUrl) {
                    console.log(`   Redirect: ${redirectUrl}`)
                    https.get(redirectUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    }, (res) => {
                        if (res.statusCode === 302 || res.statusCode === 301) {
                            // Segundo redirect
                            https.get(res.headers.location, {
                                headers: { 'User-Agent': 'Mozilla/5.0' }
                            }, (finalRes) => {
                                handleResponse(finalRes, binPath, resolve, reject)
                            }).on('error', reject)
                        } else {
                            handleResponse(res, binPath, resolve, reject)
                        }
                    }).on('error', reject)
                    return
                }
            }
            
            handleResponse(response, binPath, resolve, reject)
        }).on('error', (err) => {
            console.error('❌ Error de red:', err.message)
            reject(err)
        }).setTimeout(60000, function() {
            this.destroy()
            reject(new Error('Timeout al descargar yt-dlp'))
        })
    })
}

function handleResponse(response, binPath, resolve, reject) {
    if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
    }
    
    const file = fs.createWriteStream(binPath)
    let downloaded = 0
    
    response.on('data', (chunk) => {
        downloaded += chunk.length
        process.stdout.write(`\r   Descargado: ${(downloaded / 1024 / 1024).toFixed(2)} MB`)
    })
    
    response.pipe(file)
    
    file.on('finish', () => {
        file.close()
        console.log('')
        
        if (platform() !== 'win32') {
            try {
                fs.chmodSync(binPath, 0o755)
                console.log('✅ Permisos asignados')
            } catch {}
        }
        
        try {
            const version = execSync(`"${binPath}" --version`, { encoding: 'utf-8', timeout: 10000 }).trim()
            console.log(`✅ yt-dlp listo: ${version}`)
            resolve(binPath)
        } catch (err) {
            reject(new Error(`Descargado pero no funciona: ${err.message}`))
        }
    })
    
    file.on('error', (err) => {
        fs.unlink(binPath, () => {})
        reject(err)
    })
}
