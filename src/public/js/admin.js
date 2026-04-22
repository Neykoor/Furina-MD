const token = localStorage.getItem('token')
const role = localStorage.getItem('role')

if (!token || (role !== 'owner' && role !== 'admin')) {
    window.location.href = '/login'
}

const socket = io()

document.addEventListener('DOMContentLoaded', () => {
    loadStats()
    loadBots()
    loadUsers()
    setupConsole()
    socket.emit('subscribe-logs', token)
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

        // Update console target dropdown
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
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        const tbody = document.getElementById('bots-table')
        tbody.innerHTML = data.bots.map(b => `
      <tr>
        <td>${b.status === 'connected' ? '🟢' : '🔴'}</td>
        <td>${b.name}</td>
        <td>+${b.number}</td>
        <td>${b.owner}</td>
        <td class="action-btns">
          <button onclick="restartBot('${b.jid}')" title="Reiniciar">🔄</button>
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

        const container = document.getElementById('users-list')
        container.innerHTML = data.users.map(u => `
      <div class="user-card">
        <div class="user-card-header">
          <strong>${u.username}</strong>
          <span class="user-role-badge ${u.role}">${u.role}</span>
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem">
          Creado: ${new Date(u.createdAt).toLocaleDateString()}
        </p>
      </div>
    `).join('')
    } catch (e) {
        console.error(e)
    }
}

function setupConsole() {
    // Initial message
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
        const res = await fetch('/api/admin/restart-bot', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jid })
        })
        const data = await res.json()
        alert(data.success ? '✅ Bot reiniciado' : '❌ Error')
        loadBots()
    } catch (e) {
        alert('❌ Error')
    }
}

async function deleteBot(jid) {
    if (!confirm('¿Eliminar este bot permanentemente?')) return
    try {
        const res = await fetch('/api/admin/delete-bot', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jid })
        })
        const data = await res.json()
        alert(data.success ? '✅ Bot eliminado' : '❌ Error')
        loadBots()
        loadStats()
    } catch (e) {
        alert('❌ Error')
    }
}

function showCreateUser() {
    document.getElementById('user-modal').classList.add('active')
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active')
}

async function createUser(e) {
    e.preventDefault()
    const username = document.getElementById('new-user-name').value.replace(/\D/g, '')
    const password = document.getElementById('new-user-pass').value
    const role = document.getElementById('new-user-role').value

    try {
        const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
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

function refreshBots() {
    loadBots()
    loadStats()
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

// Enter key in console
document.getElementById('console-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeCommand()
})