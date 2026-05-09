import fs from 'fs'
import https from 'https'
import { platform } from 'os'
import { execSync } from 'child_process'

const YTDLP_VERSION = '2025.12.15'
const BIN_DIR = './bin'

function ensureBinDir() {
    if (!fs.existsSync(BIN_DIR)) {
        fs.mkdirSync(BIN_DIR, { recursive: true })
    }
}

function getBinaryName() {
    const os = platform()
    return os === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

function getBinaryPath() {
    return `${BIN_DIR}/${getBinaryName()}`
}

function getDownloadUrl() {
    const name = getBinaryName()
    return `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/${name}`
}

export function checkYtDlp() {
    const binPath = getBinaryPath()
    
    // Verificar si ya existe
    if (fs.existsSync(binPath)) {
        try {
            const version = execSync(`"${binPath}" --version`, { encoding: 'utf-8', timeout: 5000 }).trim()
            console.log(`✅ yt-dlp encontrado: ${version}`)
            return binPath
        } catch {
            console.log('⚠️ yt-dlp existe pero no funciona, re-descargando...')
        }
    }
    
    // Verificar si está en PATH del sistema
    try {
        const version = execSync('yt-dlp --version', { encoding: 'utf-8', timeout: 5000 }).trim()
        console.log(`✅ yt-dlp en PATH: ${version}`)
        return 'yt-dlp'
    } catch {
        console.log('⚠️ yt-dlp no encontrado en PATH')
    }
    
    return null
}

export async function downloadYtDlp() {
    const binPath = getBinaryPath()
    
    // Si ya existe y funciona, no descargar
    const existing = checkYtDlp()
    if (existing) return existing
    
    ensureBinDir()
    
    console.log('📥 Descargando yt-dlp...')
    console.log(`   URL: ${getDownloadUrl()}`)
    console.log(`   Destino: ${binPath}`)
    
    return new Promise((resolve, reject) => {
        const url = getDownloadUrl()
        
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/octet-stream'
            }
        }, (response) => {
            // Manejar redirects
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
        })
        
        request.on('error', (err) => {
            console.error('❌ Error de red:', err.message)
            reject(err)
        })
        
        request.setTimeout(60000, () => {
            request.destroy()
            reject(new Error('Timeout al descargar yt-dlp'))
        })
    })
}

function saveFile(response, binPath, resolve, reject) {
    const file = fs.createWriteStream(binPath)
    let downloaded = 0
    
    response.on('data', (chunk) => {
        downloaded += chunk.length
        process.stdout.write(`\r   Descargado: ${(downloaded / 1024 / 1024).toFixed(2)} MB`)
    })
    
    response.pipe(file)
    
    file.on('finish', () => {
        file.close()
        console.log('\n✅ Descarga completada')
        
        // Dar permisos de ejecución (Linux/Mac)
        if (platform() !== 'win32') {
            try {
                fs.chmodSync(binPath, 0o755)
                console.log('✅ Permisos de ejecución asignados')
            } catch (err) {
                console.warn('⚠️ No se pudieron asignar permisos:', err.message)
            }
        }
        
        // Verificar que funciona
        try {
            const version = execSync(`"${binPath}" --version`, { encoding: 'utf-8', timeout: 10000 }).trim()
            console.log(`✅ yt-dlp listo: ${version}`)
            resolve(binPath)
        } catch (err) {
            reject(new Error(`yt-dlp descargado pero no funciona: ${err.message}`))
        }
    })
    
    file.on('error', (err) => {
        fs.unlink(binPath, () => {})
        reject(err)
    })
}
