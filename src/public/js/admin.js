const token = localStorage.getItem('token')
const role = localStorage.getItem('role')

if (!token || (role !== 'owner' && role !== 'admin')) {
    window.location.href = '/login'
}

const socket = io()
let currentBots = []
let currentUsers = []
let selectedUser = null
let aiContext = []

document.addEventListener('DOMContentLoaded', () => {
    loadStats()
    loadBots()
    loadUsers()
    setupConsole()
    setupWelcomeDesigner()
    socket.emit('subscribe-logs', token)
    loadLogo()
})

socket.on('log', (data) => {
    appendConsole(data.type, data.message, data.time)
})

function loadLogo() {
    fetch('/api/info')
        .then(r => r.json())
        .then(d => {
            if (d.logo) document.getElementById('sidebar-logo').src = d.logo
        })
        .catch(() => {})
}

async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        document.getElementById('admin-total-bots').textContent = data.stats.totalBots
        document.getElementById('admin-connected').textContent = data.stats.connectedBots
        document.getElementById('admin-total-users').textContent = data.stats.totalUsers
        document.getElementById('admin-memory').textContent =
            Math.round(data.stats.memory.heapUsed / 1024 / 1024) + 'MB'

        const select = document.getElementById('console-target')
        select.innerHTML = '<option value="all">📡 Todos los bots</option>'
        data.bots.forEach(b => {
            select.innerHTML += `<option value="${b.jid}">${b.name} (${b.number})</option>`
        })
    } catch (e) {
        console.error(e)
    }
}

async function loadBots() {
    try {
        const res = await fetch('/api/admin/bots', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        currentBots = data.bots
        const tbody = document.getElementById('bots-table')
        tbody.innerHTML = data.bots.map(b => `
            <tr>
                <td>${b.status === 'connected' ? '🟢' : '🔴'}</td>
                <td>${escapeHtml(b.name)}</td>
                <td>+${b.number}</td>
                <td>${escapeHtml(b.owner)}</td>
                <td class="action-btns">
                    <button onclick="restartBot('${b.jid}')" title="Reiniciar">🔄</button>
                    <button onclick="reinstallBot('${b.jid}')" title="Reinstalar Módulos">📦</button>
                    <button onclick="deleteBot('${b.jid}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `).join('')
    } catch (e) {
        console.error(e)
    }
}

async function loadUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        currentUsers = data.users
        const container = document.getElementById('users-list')
        container.innerHTML = data.users.map(u => `
            <div class="user-card" onclick="showUserActions('${u.username}')">
                <div class="user-card-header">
                    <strong>${u.username}</strong>
                    <span class="user-role-badge ${u.role}">${u.role}</span>
                </div>
                <p style="color:var(--text-muted);font-size:0.85rem">
                    💰 Dinero: $${u.money || 0}<br>
                    📱 Tel: ${u.profile?.phone || u.username}<br>
                    📧 ${u.email || 'Sin email'} ${u.emailVerified ? '✅' : '❌'}<br>
                    Creado: ${new Date(u.createdAt).toLocaleDateString()}
                </p>
            </div>
        `).join('')
    } catch (e) {
        console.error(e)
    }
}

function setupConsole() {
    document.getElementById('console-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeCommand()
    })
}

function appendConsole(type, message, time) {
    const output = document.getElementById('console-output')
    const line = document.createElement('div')
    line.className = `console-line ${type}`
    line.textContent = `[${new Date(time).toLocaleTimeString()}] ${message}`
    output.appendChild(line)
    output.scrollTop = output.scrollHeight
}

function clearConsole() {
    document.getElementById('console-output').innerHTML =
        '<div class="console-line system">🟢 Consola limpiada...</div>'
}

function exportLogs() {
    const output = document.getElementById('console-output').innerText
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asta-logs-${Date.now()}.txt`
    a.click()
}

async function executeCommand() {
    const target = document.getElementById('console-target').value
    const command = document.getElementById('console-input').value
    if (!command) return

    appendConsole('info', `> Ejecutando: ${command} en ${target}`)

    try {
        const res = await fetch('/api/admin/exec', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target, command })
        })
        const data = await res.json()
        data.results.forEach(r => {
            appendConsole(r.status === 'error' ? 'error' : 'system',
                `${r.jid}: ${r.status}${r.error ? ' - ' + r.error : ''}`)
        })
    } catch (e) {
        appendConsole('error', 'Error ejecutando comando')
    }

    document.getElementById('console-input').value = ''
}

async function restartBot(jid) {
    if (!confirm('¿Reiniciar este bot?')) return
    try {
        const res = await fetch(`/api/admin/bot/${encodeURIComponent(jid)}/restart`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Bot reiniciado' : '❌ Error', data.success ? 'success' : 'error')
        loadBots()
        loadStats()
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

async function reinstallBot(jid) {
    if (!confirm('¿Reinstalar módulos? Esto eliminará node_modules y package-lock.json')) return
    try {
        const res = await fetch(`/api/admin/bot/${encodeURIComponent(jid)}/reinstall`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Módulos eliminados' : '❌ Error', data.success ? 'success' : 'error')
        loadBots()
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

async function deleteBot(jid) {
    if (!confirm('¿Eliminar este bot permanentemente?')) return
    try {
        const res = await fetch(`/api/admin/bot/${encodeURIComponent(jid)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Bot eliminado' : '❌ Error', data.success ? 'success' : 'error')
        loadBots()
        loadStats()
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

function showCreateUserModal() {
    document.getElementById('user-modal').classList.add('active')
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active')
}

async function createUser(e) {
    e.preventDefault()
    const username = document.getElementById('new-user-name').value
    const phone = document.getElementById('new-user-phone').value.replace(/\D/g, '')
    const password = document.getElementById('new-user-pass').value
    const role = document.getElementById('new-user-role').value

    if (!username || !password) {
        showToast('❌ Completa los campos obligatorios', 'error')
        return
    }

    if (password.length < 6) {
        showToast('❌ La contraseña debe tener al menos 6 caracteres', 'error')
        return
    }

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: phone || username, password, role })
        })
        const data = await res.json()
        if (data.success) {
            closeUserModal()
            loadUsers()
            showToast('✅ Usuario creado', 'success')
            // Reset form
            document.getElementById('new-user-name').value = ''
            document.getElementById('new-user-phone').value = ''
            document.getElementById('new-user-pass').value = ''
        } else {
            showToast('❌ ' + (data.error || 'Error creando usuario'), 'error')
        }
    } catch (e) {
        showToast('❌ Error de conexión', 'error')
    }
}

function showUserActions(username) {
    selectedUser = username
    const user = currentUsers.find(u => u.username === username)
    document.getElementById('action-user-name').textContent = user?.username || username
    document.getElementById('user-actions-modal').classList.add('active')
}

function closeUserActionsModal() {
    document.getElementById('user-actions-modal').classList.remove('active')
    selectedUser = null
}

async function addMoney() {
    const amount = prompt('¿Cuánto dinero agregar?')
    if (!amount || isNaN(amount) || amount <= 0) {
        showToast('❌ Cantidad inválida', 'error')
        return
    }
    await updateMoney('add', amount)
}

async function removeMoney() {
    const amount = prompt('¿Cuánto dinero quitar?')
    if (!amount || isNaN(amount) || amount <= 0) {
        showToast('❌ Cantidad inválida', 'error')
        return
    }
    await updateMoney('remove', amount)
}

async function setMoney() {
    const amount = prompt('¿Establecer dinero a?')
    if (!amount || isNaN(amount) || amount < 0) {
        showToast('❌ Cantidad inválida', 'error')
        return
    }
    await updateMoney('set', amount)
}

async function updateMoney(action, amount) {
    if (!selectedUser) return
    try {
        const res = await fetch(`/api/admin/users/${selectedUser}/money`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, amount: parseInt(amount) })
        })
        const data = await res.json()
        if (data.success) {
            showToast(`✅ Dinero actualizado: $${data.user.money}`, 'success')
            loadUsers()
            closeUserActionsModal()
        }
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

async function deleteUser() {
    if (!selectedUser) return
    if (!confirm(`¿Eliminar usuario ${selectedUser}?`)) return
    try {
        const res = await fetch(`/api/admin/users/${selectedUser}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
            showToast('✅ Usuario eliminado', 'success')
            loadUsers()
            closeUserActionsModal()
        }
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

// ==================== AI ADMIN ====================
function switchAITab(tab) {
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.ai-panel').forEach(p => p.classList.remove('active'))

    event.target.classList.add('active')
    document.getElementById(`ai-${tab}-panel`).classList.add('active')
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input')
    const message = input.value.trim()
    if (!message) return

    addAIMessage(message, 'user')
    input.value = ''
    showAITyping()

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, context: aiContext })
        })
        const data = await res.json()

        hideAITyping()

        if (data.success) {
            addAIMessage(data.response, 'bot')
            aiContext.push({ role: 'user', content: message })
            aiContext.push({ role: 'assistant', content: data.response })
            if (aiContext.length > 10) aiContext = aiContext.slice(-10)
        } else {
            addAIMessage('❌ Error: ' + (data.error || 'No pude procesar tu mensaje'), 'bot')
        }
    } catch (e) {
        hideAITyping()
        addAIMessage('❌ Error de conexión', 'bot')
    }
}

function addAIMessage(text, type) {
    const container = document.getElementById('ai-messages')
    const div = document.createElement('div')
    div.className = `ai-message ${type}`

    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

    if (type === 'bot' || type === 'system') {
        div.innerHTML = `
            <div class="ai-avatar">${type === 'system' ? '🧠' : '🤖'}</div>
            <div class="ai-content">
                <div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>
                <span class="message-time">${time}</span>
            </div>
        `
    } else {
        div.innerHTML = `
            <div class="ai-content user-ai-content">
                <div>${escapeHtml(text)}</div>
                <span class="message-time">${time}</span>
            </div>
            <div class="ai-avatar user-ai-avatar">👤</div>
        `
    }

    container.appendChild(div)
    container.scrollTop = container.scrollHeight
}

function showAITyping() {
    const container = document.getElementById('ai-messages')
    const div = document.createElement('div')
    div.id = 'ai-typing'
    div.className = 'ai-message bot'
    div.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-content">
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `
    container.appendChild(div)
    container.scrollTop = container.scrollHeight
}

function hideAITyping() {
    const typing = document.getElementById('ai-typing')
    if (typing) typing.remove()
}

async function analyzeDocuments() {
    const checkboxes = document.querySelectorAll('#file-selector input:checked')
    const files = Array.from(checkboxes).map(cb => cb.value)
    const prompt = document.getElementById('analyze-prompt').value.trim()

    if (!files.length) {
        showToast('❌ Selecciona al menos un archivo', 'error')
        return
    }

    const resultDiv = document.getElementById('analyze-result')
    resultDiv.innerHTML = '<p>⏳ Analizando documentos...</p>'

    try {
        const res = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files, prompt: prompt || 'Analiza estos archivos y da recomendaciones de mejora' })
        })
        const data = await res.json()

        if (data.success) {
            resultDiv.innerHTML = `
                <div class="analyze-success">
                    <h4>✅ Análisis Completado</h4>
                    <div class="analyze-content">${escapeHtml(data.analysis).replace(/\n/g, '<br>')}</div>
                    <small>Modelo: ${data.model}</small>
                </div>
            `
        } else {
            resultDiv.innerHTML = `<div class="analyze-error">❌ ${data.error || 'Error en el análisis'}</div>`
        }
    } catch (e) {
        resultDiv.innerHTML = '<div class="analyze-error">❌ Error de conexión</div>'
    }
}

async function generateCommand() {
    const description = document.getElementById('gen-description').value.trim()
    const type = document.getElementById('gen-type').value

    if (!description) {
        showToast('❌ Describe el comando que quieres generar', 'error')
        return
    }

    const resultDiv = document.getElementById('generate-result')
    resultDiv.innerHTML = '<p>⏳ Generando código...</p>'

    try {
        const res = await fetch('/api/ai/generate-command', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description, type })
        })
        const data = await res.json()

        if (data.success) {
            resultDiv.innerHTML = `
                <div class="generate-success">
                    <h4>✅ Código Generado</h4>
                    <pre class="code-block"><code>${escapeHtml(data.code)}</code></pre>
                    <button onclick="copyGeneratedCode()" class="btn-outline btn-small">📋 Copiar Código</button>
                    <button onclick="downloadGeneratedCode()" class="btn-glow btn-small">💾 Descargar .js</button>
                </div>
            `
            window.generatedCode = data.code
        } else {
            resultDiv.innerHTML = `<div class="generate-error">❌ ${data.error || 'Error generando código'}</div>`
        }
    } catch (e) {
        resultDiv.innerHTML = '<div class="generate-error">❌ Error de conexión</div>'
    }
}

function copyGeneratedCode() {
    if (window.generatedCode) {
        navigator.clipboard.writeText(window.generatedCode)
        showToast('✅ Código copiado', 'success')
    }
}

function downloadGeneratedCode() {
    if (window.generatedCode) {
        const blob = new Blob([window.generatedCode], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `command_${Date.now()}.js`
        a.click()
    }
}

// ==================== DOCUMENTS ====================
async function listDocuments() {
    const docsList = document.getElementById('docs-list')
    docsList.innerHTML = '<p>⏳ Cargando documentos...</p>'

    const docs = [
        { name: 'web.js', path: 'lib/web.js', desc: 'Servidor web y APIs' },
        { name: 'serbot.js', path: 'lib/serbot.js', desc: 'Gestión de sub-bots' },
        { name: 'message-handler.js', path: 'lib/message-handler.js', desc: 'Handler de mensajes' },
        { name: 'dashboard.js', path: 'src/public/js/dashboard.js', desc: 'Dashboard frontend' },
        { name: 'auth.js', path: 'src/public/js/auth.js', desc: 'Autenticación' },
        { name: 'admin.js', path: 'src/public/js/admin.js', desc: 'Panel admin' }
    ]

    docsList.innerHTML = docs.map(d => `
        <div class="doc-item" onclick="readDocument('${d.path}')">
            <span class="doc-icon">📄</span>
            <div class="doc-info">
                <strong>${d.name}</strong>
                <span>${d.desc}</span>
            </div>
        </div>
    `).join('')
}

async function readDocument(path) {
    // In a real implementation, this would fetch from the server
    showToast('📖 Leyendo documento...', 'info')
}

function editDocumentPrompt() {
    const filename = prompt('Nombre del archivo a editar (ej: lib/web.js)')
    if (filename) {
        document.getElementById('doc-filename').value = filename
        document.getElementById('doc-editor').style.display = 'block'
        document.getElementById('docs-list').style.display = 'none'
    }
}

function saveDocument() {
    showToast('💾 Documento guardado', 'success')
    closeDocEditor()
}

function closeDocEditor() {
    document.getElementById('doc-editor').style.display = 'none'
    document.getElementById('docs-list').style.display = 'block'
}

// ==================== WELCOME DESIGNER ====================
function setupWelcomeDesigner() {
    const inputs = ['w-title', 'w-title-color', 'w-name-color', 'w-group-color', 'w-border-color',
        'w-avatar-x', 'w-avatar-y', 'w-avatar-r']
    inputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateWelcomePreview)
    })
    updateWelcomePreview()
}

function updateWelcomePreview() {
    const title = document.getElementById('w-title').value
    const titleColor = document.getElementById('w-title-color').value
    const nameColor = document.getElementById('w-name-color').value
    const groupColor = document.getElementById('w-group-color').value
    const borderColor = document.getElementById('w-border-color').value
    const avatarX = document.getElementById('w-avatar-x').value
    const avatarY = document.getElementById('w-avatar-y').value
    const avatarR = document.getElementById('w-avatar-r').value

    document.getElementById('preview-title').textContent = title
    document.getElementById('preview-title').style.color = titleColor
    document.getElementById('preview-name').style.color = nameColor
    document.getElementById('preview-group').style.color = groupColor
    document.getElementById('preview-avatar').style.borderColor = borderColor
    document.getElementById('preview-avatar').style.left = avatarX + 'px'
    document.getElementById('preview-avatar').style.top = avatarY + 'px'
    document.getElementById('preview-avatar').style.width = (avatarR * 2) + 'px'
    document.getElementById('preview-avatar').style.height = (avatarR * 2) + 'px'
}

function previewBgImage(input) {
    const file = input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
        document.getElementById('welcome-canvas').style.backgroundImage = `url(${e.target.result})`
    }
    reader.readAsDataURL(file)
}

async function saveWelcomeConfig() {
    const groupJid = prompt('¿Para qué grupo? (ej: 123456789@g.us)')
    if (!groupJid) return

    const config = {
        titleText: document.getElementById('w-title').value,
        titleColor: document.getElementById('w-title-color').value,
        nameColor: document.getElementById('w-name-color').value,
        groupColor: document.getElementById('w-group-color').value,
        borderColor: document.getElementById('w-border-color').value,
        avatarX: parseInt(document.getElementById('w-avatar-x').value),
        avatarY: parseInt(document.getElementById('w-avatar-y').value),
        avatarRadius: parseInt(document.getElementById('w-avatar-r').value),
        caption: document.getElementById('w-caption').value,
        captionBye: document.getElementById('w-caption-bye').value
    }

    try {
        const res = await fetch(`/api/dashboard/welcome/${encodeURIComponent(groupJid)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        })
        const data = await res.json()
        showToast(data.success ? '✅ Configuración guardada' : '❌ Error', data.success ? 'success' : 'error')
    } catch (e) {
        showToast('❌ Error de conexión', 'error')
    }
}

// ==================== UI ====================
function showAdminSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.getElementById(`admin-${id}`).classList.add('active')

    const navItems = document.querySelectorAll('.nav-item')
    navItems.forEach(item => {
        if (item.getAttribute('onclick')?.includes(`'${id}'`)) {
            item.classList.add('active')
        }
    })
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('sidebar-overlay')
    sidebar.classList.toggle('open')
    overlay.classList.toggle('active')
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#06B6D4'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `
    document.body.appendChild(toast)
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease'
        setTimeout(() => toast.remove(), 300)
    }, 4000)
}

function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    window.location.href = '/login'
}

const style = document.createElement('style')
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`
document.head.appendChild(style)
