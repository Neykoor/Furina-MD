import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

const execPromise = promisify(exec)

let handler = async (m, { conn, args, usedPrefix }) => {
  const from = m.chat

  if (!m.isOwner) {
    return conn.sendMessage(from, { 
      text: '👑 Este comando es solo para *owners*.' 
    }, { quoted: m })
  }

  const msg = await conn.sendMessage(from, { 
    text: '🔄 *Actualizando el bot...*\n\n⏳ Verificando cambios...' 
  }, { quoted: m })

  try {
    const gitDir = path.join(process.cwd(), '.git')
    if (!fs.existsSync(gitDir)) {
      await conn.sendMessage(from, { 
        text: '⚠️ *Git no inicializado*\n\nIntentando configurar repositorio...',
        edit: msg.key
      })

      try {
        await execPromise('git init')
        const repoUrl = global.github || 'https://github.com/tuusuario/tu-repo.git'
        await execPromise(`git remote add origin ${repoUrl}`)
        await execPromise('git fetch origin')
        await execPromise('git reset --hard origin/main')

        await conn.sendMessage(from, { 
          text: '✅ *Repositorio configurado correctamente*\n\nReinicia el bot para aplicar los cambios.',
          edit: msg.key
        })

        setTimeout(() => process.exit(0), 2000)
        return
      } catch (gitError) {
        return conn.sendMessage(from, { 
          text: `❌ *Error al configurar git*\n\n${gitError.message}\n\n💡 *Configura manual:*\n\`\`\`bash\ngit init\ngit remote add origin ${global.repo || 'URL_DEL_REPO'}\ngit pull origin main\nnpm install\nnpm start\n\`\`\``,
          edit: msg.key
        })
      }
    }

    let currentBranch = 'main'
    try {
      const { stdout: branchStdout } = await execPromise('git branch --show-current')
      currentBranch = branchStdout.trim() || 'main'
    } catch {
      currentBranch = 'main'
    }

    await conn.sendMessage(from, { 
      text: `🔄 *Actualizando el bot...*\n\n📂 Rama: *${currentBranch}*\n⏳ Obteniendo cambios remotos...`,
      edit: msg.key
    })

    await execPromise('git fetch origin')

    const { stdout: statusStdout } = await execPromise('git status -sb')

    if (statusStdout.includes('up to date') || statusStdout.includes('up-to-date')) {
      return conn.sendMessage(from, { 
        text: `✅ *El bot ya está actualizado*\n\n📂 Rama: *${currentBranch}*\n🔖 Última versión instalada.`,
        edit: msg.key
      })
    }

    let cambios = 'No se pudieron obtener los cambios'
    try {
      const { stdout: logStdout } = await execPromise('git log --oneline HEAD..origin/main | head -5')
      cambios = logStdout.trim() || 'Cambios disponibles para actualizar'
    } catch {}

    await conn.sendMessage(from, { 
      text: `🔄 *Actualizando el bot...*\n\n📂 Rama: *${currentBranch}*\n📝 *Cambios encontrados:*\n\`\`\`${cambios}\`\`\`\n⏳ Descargando actualizaciones...`,
      edit: msg.key
    })

    await execPromise('git pull origin main')

    let diffStdout = ''
    try {
      const result = await execPromise('git diff HEAD@{1} HEAD --name-only | grep package.json || true')
      diffStdout = result.stdout
    } catch {}

    if (diffStdout.includes('package.json')) {
      await conn.sendMessage(from, { 
        text: `🔄 *Actualizando el bot...*\n\n⏳ Instalando nuevas dependencias...`,
        edit: msg.key
      })
      await execPromise('npm install --no-audit --no-fund')
    }

    let commitInfo = 'Nuevo commit'
    try {
      const { stdout: commitStdout } = await execPromise('git log -1 --oneline')
      commitInfo = commitStdout.trim()
    } catch {}

    let version = 'N/A'
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
      version = packageJson.version || 'N/A'
    } catch {}

    const mensajeFinal = `✅ *¡Actualización completada!*\n\n` +
      `📦 *Versión:* ${version}\n` +
      `📂 *Rama:* ${currentBranch}\n` +
      `🔖 *Último commit:* ${commitInfo}\n\n` +
      `🔄 *Reiniciando bot en 2 segundos...*`

    await conn.sendMessage(from, { 
      text: mensajeFinal,
      edit: msg.key
    })

    setTimeout(() => {
      console.log(chalk.green('✅ Bot actualizado, reiniciando...'))
      process.exit(0)
    }, 2000)

  } catch (error) {
    console.error('Error en update:', error)

    let errorMsg = error.message

    if (errorMsg.includes('fatal: not a git repository')) {
      errorMsg = 'No es un repositorio git. Usa: git clone [URL] para clonar el bot.'
    } else if (errorMsg.includes('could not read Username')) {
      errorMsg = 'Error de autenticación. Configura git con:\ngit config --global user.name "tu nombre"\ngit config --global user.email "tu@email.com"'
    } else if (errorMsg.includes('Permission denied')) {
      errorMsg = 'Permiso denegado. Verifica tus credenciales de GitHub o usa un token.'
    } else if (errorMsg.includes('npm install')) {
      errorMsg = 'Error al instalar dependencias. Revisa npm install manualmente.'
    } else if (errorMsg.includes('Network error')) {
      errorMsg = 'Error de red. Verifica tu conexión a internet.'
    }

    await conn.sendMessage(from, { 
      text: `❌ *Error al actualizar:*\n\n${errorMsg}\n\n💡 *Solución manual:*\n\`\`\`bash\ngit pull origin main\nnpm install\nnpm start\n\`\`\``,
      edit: msg.key
    })
  }
}

handler.help = ['update', 'actualizar']
handler.tags = ['owner']
handler.command = ['update', 'actualizar']
handler.owner = true

export default handler
