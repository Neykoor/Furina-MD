const token = localStorage.getItem('token')
const role = localStorage.getItem('role')

if (!token || (role !== 'owner' && role !== 'admin')) {
    window.location.href = '/login'
}

const socket = io()
let currentBots = []
let currentUsers = []
let selectedUser = null

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
                <td>${b.name}</td>
                <td>+${b.number}</td>
                <td>${b.owner}</td>
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
        alert(data.success ? '✅ Bot reiniciado' : '❌ Error')
        loadBots()
    } catch (e) {
        alert('❌ Error')
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
        alert(data.success ? '✅ Módulos eliminados. Ejecuta npm install.' : '❌ Error')
        loadBots()
    } catch (e) {
        alert('❌ Error')
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
        alert(data.success ? '✅ Bot eliminado' : '❌ Error')
        loadBots()
        loadStats()
    } catch (e) {
        alert('❌ Error')
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

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: phone, password, role })
        })
        const data = await res.json()
        if (data.success) {
            closeUserModal()
            loadUsers()
            alert('✅ Usuario creado')
        } else {
            alert('❌ ' + data.error)
        }
    } catch (e) {
        alert('❌ Error')
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
    if (!amount) return
    await updateMoney('add', amount)
}

async function removeMoney() {
    const amount = prompt('¿Cuánto dinero quitar?')
    if (!amount) return
    await updateMoney('remove', amount)
}

async function setMoney() {
    const amount = prompt('¿Establecer dinero a?')
    if (!amount) return
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
            alert(`✅ Dinero actualizado: $${data.user.money}`)
            loadUsers()
            closeUserActionsModal()
        }
    } catch (e) {
        alert('❌ Error')
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
            alert('✅ Usuario eliminado')
            loadUsers()
            closeUserActionsModal()
        }
    } catch (e) {
        alert('❌ Error')
    }
}

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
        alert(data.success ? '✅ Configuración guardada' : '❌ Error')
    } catch (e) {
        alert('❌ Error de conexión')
    }
}

function showAdminSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.getElementById(`admin-${id}`).classList.add('active')
    event.target.classList.add('active')
}

function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    window.location.href = '/login'
}