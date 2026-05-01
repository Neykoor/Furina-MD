import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const execPromise = promisify(exec)

const REPO_URL = global.github || 'https://github.com/Fer2809fl/asta-.git'

async function ensureOrigin(repoUrl) {
    try {
        const { stdout } = await execPromise('git remote get-url origin')
        const currentUrl = stdout.trim()
        if (currentUrl !== repoUrl) {
            await execPromise(`git remote set-url origin ${repoUrl}`)
            return { fixed: true, msg: `Remote actualizado de \`${currentUrl}\` a \`${repoUrl}\`` }
        }
        return { fixed: false, msg: null }
    } catch {
        await execPromise(`git remote add origin ${repoUrl}`)
        return { fixed: true, msg: `Remote "origin" agregado: \`${repoUrl}\`` }
    }
}

async function ensureGitRepo(repoUrl) {
    const gitDir = path.join(process.cwd(), '.git')
    if (!fs.existsSync(gitDir)) {
        await execPromise('git init')
        await execPromise(`git remote add origin ${repoUrl}`)
        return true
    }
    return false
}

let handler = async (m, { conn, usedPrefix }) => {
    const from = m.chat

    if (!m.isOwner) {
        return conn.sendMessage(from, {
            text: '👑 Este comando es solo para *owners*.'
        }, { quoted: m })
    }

    const msg = await conn.sendMessage(from, {
        text: '🔄 *Actualizando el bot...*\n\n⏳ Verificando entorno git...'
    }, { quoted: m })

    const repoUrl = global.github || REPO_URL

    try {
        const wasNew = await ensureGitRepo(repoUrl)
        if (wasNew) {
            await conn.sendMessage(from, {
                text: `⚙️ Repositorio git inicializado.\n🔗 Remote configurado: \`${repoUrl}\``,
                edit: msg.key
            })
        } else {
            const { fixed, msg: fixMsg } = await ensureOrigin(repoUrl)
            if (fixed) {
                await conn.sendMessage(from, {
                    text: `⚙️ Remote reparado automáticamente:\n${fixMsg}`,
                    edit: msg.key
                })
            }
        }

        let currentBranch = 'main'
        try {
            const { stdout } = await execPromise('git branch --show-current')
            currentBranch = stdout.trim() || 'main'
        } catch { }

        await conn.sendMessage(from, {
            text: `🔄 *Actualizando el bot...*\n\n📂 Rama: *${currentBranch}*\n⏳ Obteniendo cambios remotos...`,
            edit: msg.key
        })

        try {
            await execPromise('git fetch origin')
        } catch (fetchErr) {
            throw new Error(`No se pudo conectar al repositorio remoto.\n\n🔗 URL: \`${repoUrl}\`\n\n_Verifica que la URL sea correcta y tengas acceso a internet._`)
        }
        let behindCount = 0
        try {
            const { stdout } = await execPromise(`git rev-list HEAD..origin/${currentBranch} --count`)
            behindCount = parseInt(stdout.trim()) || 0
        } catch { }

        if (behindCount === 0) {
            return conn.sendMessage(from, {
                text: `✅ *El bot ya está actualizado*\n\n📂 Rama: *${currentBranch}*\n🔖 No hay commits nuevos.`,
                edit: msg.key
            })
        }

        let cambios = 'Cambios disponibles'
        try {
            const { stdout } = await execPromise(`git log --oneline HEAD..origin/${currentBranch}`)
            const lineas = stdout.trim().split('\n').slice(0, 5)
            cambios = lineas.join('\n')
        } catch { }

        await conn.sendMessage(from, {
            text: `🔄 *Actualizando el bot...*\n\n📂 Rama: *${currentBranch}*\n📝 *${behindCount} commit(s) nuevos:*\n\`\`\`${cambios}\`\`\`\n⏳ Aplicando...`,
            edit: msg.key
        })

        await execPromise(`git pull origin ${currentBranch}`)

        let needsInstall = false
        try {
            const { stdout } = await execPromise('git diff HEAD@{1} HEAD --name-only')
            needsInstall = stdout.includes('package.json')
        } catch { }

        if (needsInstall) {
            await conn.sendMessage(from, {
                text: `🔄 *Actualizando el bot...*\n\n⏳ Instalando nuevas dependencias...`,
                edit: msg.key
            })
            await execPromise('npm install --no-audit --no-fund')
        }

        let commitInfo = ''
        try {
            const { stdout } = await execPromise('git log -1 --oneline')
            commitInfo = stdout.trim()
        } catch { }

        let version = 'N/A'
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
            version = pkg.version || 'N/A'
        } catch { }

        await conn.sendMessage(from, {
            text: `✅ *¡Actualización completada!*\n\n` +
                `📦 *Versión:* ${version}\n` +
                `📂 *Rama:* ${currentBranch}\n` +
                `🔖 *Último commit:* ${commitInfo}\n\n` +
                `🔄 *Reiniciando bot en 3 segundos...*`,
            edit: msg.key
        })

        setTimeout(() => {
            console.log(chalk.green('✅ Bot actualizado correctamente. Reiniciando...'))
            process.exit(0)
        }, 3000)

    } catch (error) {
        console.error(chalk.red('Error en update:'), error.message)

        let errorMsg = error.message

        if (errorMsg.includes('not a git repository')) {
            errorMsg = 'No es un repositorio git. Clona el bot con:\n`git clone ' + repoUrl + '`'
        } else if (errorMsg.includes('could not read Username') || errorMsg.includes('Authentication failed')) {
            errorMsg = 'Error de autenticación. El repositorio puede ser privado o requiere credenciales.'
        } else if (errorMsg.includes('Permission denied')) {
            errorMsg = 'Permiso denegado. Verifica el acceso al repositorio.'
        } else if (errorMsg.includes('npm')) {
            errorMsg = 'Error al instalar dependencias. Corre `npm install` manualmente.'
        } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ETIMEDOUT') || errorMsg.includes('Network')) {
            errorMsg = 'Sin conexión a internet o el servidor no responde.'
        }

        await conn.sendMessage(from, {
            text: `❌ *Error al actualizar*\n\n${errorMsg}\n\n` +
                `💡 *Solución manual:*\n\`\`\`\ngit remote set-url origin ${repoUrl}\ngit pull origin main\nnpm install\nnpm start\`\`\``,
            edit: msg.key
        })
    }
}

handler.help = ['update', 'actualizar']
handler.tags = ['owner']
handler.command = ['update', 'actualizar']
handler.owner = true

export default handler
