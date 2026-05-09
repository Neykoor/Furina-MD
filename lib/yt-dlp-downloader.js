// lib/yt-dlp-downloader.js
// Descarga yt-dlp automáticamente si no existe

import fs from 'fs'
import https from 'https'
import { platform } from 'os'
import { execSync } from 'child_process'

const YTDLP_VERSION = '2025.12.15'
const BIN_DIR = './bin'

function getBinaryName() {
    return platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

function getBinaryPath() {
    return `${BIN_DIR}/${getBinaryName()}`
}

function getDownloadUrl() {
    return `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${getBinaryName()}`
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
    
    const binPath = getBinaryPath()
    
    return new Promise((resolve, reject) => {
        https.get(getDownloadUrl(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    https.get(response.headers.location, (res) => {
                        saveFile(res, binPath, resolve, reject)
                    }).on('error', reject)
                    return
                }
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`))
                return
            }
            
            saveFile(response, binPath, resolve, reject)
        }).on('error', reject).setTimeout(60000, function() {
            this.destroy()
            reject(new Error('Timeout'))
        })
    })
}

function saveFile(response, binPath, resolve, reject) {
    const file = fs.createWriteStream(binPath)
    let downloaded = 0
    
    response.on('data', (chunk) => {
        downloaded += chunk.length
        process.stdout.write(`\r   ${(downloaded / 1024 / 1024).toFixed(2)} MB`)
    })
    
    response.pipe(file)
    
    file.on('finish', () => {
        file.close()
        console.log('')
        
        if (platform() !== 'win32') {
            try { fs.chmodSync(binPath, 0o755) } catch {}
        }
        
        try {
            const version = execSync(`"${binPath}" --version`, { encoding: 'utf-8', timeout: 10000 }).trim()
            console.log(`✅ yt-dlp listo: ${version}`)
            resolve(binPath)
        } catch (err) {
            reject(new Error(`No funciona: ${err.message}`))
        }
    })
    
    file.on('error', (err) => {
        fs.unlink(binPath, () => {})
        reject(err)
    })
}
