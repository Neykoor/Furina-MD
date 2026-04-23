const token = localStorage.getItem('token')
if (!token) window.location.href = '/login'

let currentBot = null
let currentGroups = []
let currentGroupJid = null

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard()
    loadProfile()
    loadLogo()
})

function loadLogo() {
    fetch('/api/info')
        .then(r => r.json())
        .then(d => {
            if (d.logo) document.getElementById('sidebar-logo').src = d.logo
        })
}

async function loadProfile() {
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        const p = data.profile
        document.getElementById('profile-username').textContent = p.username
        document.getElementById('profile-phone').textContent = '📱 ' + (p.phone || p.username)
        document.getElementById('profile-role').textContent = '🔰 ' + p.role.toUpperCase()
        document.getElementById('profile-money').textContent = '💰 $' + (p.money || 0)
        document.getElementById('profile-bio').textContent = p.bio || 'Sin biografía'
        document.getElementById('edit-bio').value = p.bio || ''
        document.getElementById('edit-avatar').value = p.avatar || ''

        if (p.avatar) {
            document.getElementById('profile-avatar').innerHTML = `<img src="${p.avatar}" alt="Avatar">`
        }
    } catch (e) {
        console.error('Error cargando perfil:', e)
    }
}

async function updateProfile() {
    const bio = document.getElementById('edit-bio').value
    const avatar = document.getElementById('edit-avatar').value

    try {
        const res = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio, avatar })
        })
        const data = await res.json()
        if (data.success) {
            alert('✅ Perfil actualizado')
            loadProfile()
        }
    } catch (e) {
        alert('❌ Error')
    }
}

async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()

        if (!data.success) {
            if (data.error === 'No autorizado') {
                logout()
                return
            }
        }

        const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const me = await meRes.json()
        if (me.success) {
            document.getElementById('welcome-text').textContent = `Hola, ${me.user.username}`
            document.getElementById('user-role').textContent = me.user.role
        }

        if (!data.hasBot) {
            document.getElementById('no-bot-msg').style.display = 'block'
            document.getElementById('bot-status').style.display = 'none'
            return
        }

        currentBot = data.bot
        renderBotStatus(data.bot)
        renderGroups(data.bot.groups)
        fillConfigForm(data.bot.config)
        fillWelcomeGroups(data.bot.groups)

    } catch (e) {
        console.error('Error:', e)
    }
}

function renderBotStatus(bot) {
    const isConnected = bot.status === 'connected'
    document.getElementById('status-dot').textContent = isConnected ? '🟢' : '🔴'
    document.getElementById('bot-name').textContent = bot.name
    document.getElementById('bot-number').textContent = `+${bot.number}`
    document.getElementById('status-tag').textContent = isConnected ? 'Conectado' : 'Desconectado'
    document.getElementById('status-tag').className = `status-tag ${isConnected ? 'connected' : ''}`

    document.getElementById('group-count').textContent = bot.groups?.length || 0
    document.getElementById('uptime-val').textContent = formatTime(bot.uptime)
    document.getElementById('mode-val').textContent = bot.config.mode === 'private' ? 'Privado' : 'Público'
}

function renderGroups(groups) {
    currentGroups = groups
    const container = document.getElementById('groups-list')
    if (!groups?.length) {
        container.innerHTML = '<p style="color:var(--text-muted)">No estás en ningún grupo</p>'
        return
    }

    container.innerHTML = groups.map(g => `
        <div class="group-card" onclick="showGroupDetail('${g.jid}')">
            <h4>${g.name}</h4>
            <div class="group-meta">
                <span>👥 ${g.participants}</span>
                <span>${g.isAdmin ? '⭐ Admin' : '👤 Miembro'}</span>
            </div>
            ${g.isAdmin ? '<span class="group-admin-badge">ADMIN</span>' : ''}
        </div>
    `).join('')
}

function fillWelcomeGroups(groups) {
    const select = document.getElementById('welcome-group-select')
    select.innerHTML = '<option value="">-- Selecciona un grupo --</option>'
    if (!groups) return
    groups.forEach(g => {
        select.innerHTML += `<option value="${g.jid}">${g.name}</option>`
    })
}

async function loadWelcomeForGroup(groupJid) {
    if (!groupJid) {
        document.getElementById('welcome-editor').style.display = 'none'
        return
    }

    try {
        const res = await fetch(`/api/dashboard/welcome/${encodeURIComponent(groupJid)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (!data.success) return

        const cfg = data.config
        document.getElementById('dw-title').value = cfg.titleText
        document.getElementById('dw-title-color').value = cfg.titleColor
        document.getElementById('dw-caption').value = cfg.caption
        document.getElementById('dw-caption-bye').value = cfg.captionBye

        document.getElementById('welcome-editor').style.display = 'block'
        currentGroupJid = groupJid
    } catch (e) {
        console.error('Error cargando welcome:', e)
    }
}

async function saveDashboardWelcome() {
    if (!currentGroupJid) return

    const config = {
        titleText: document.getElementById('dw-title').value,
        titleColor: document.getElementById('dw-title-color').value,
        caption: document.getElementById('dw-caption').value,
        captionBye: document.getElementById('dw-caption-bye').value
    }

    try {
        const res = await fetch(`/api/dashboard/welcome/${encodeURIComponent(currentGroupJid)}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        })
        const data = await res.json()
        alert(data.success ? '✅ Welcome guardado' : '❌ Error')
    } catch (e) {
        alert('❌ Error de conexión')
    }
}

function fillConfigForm(config) {
    document.getElementById('cfg-name').value = currentBot?.name || ''
    document.getElementById('cfg-mode').value = config.mode || 'public'
    document.getElementById('cfg-antipriv').value = String(config.antiPrivate || false)
    document.getElementById('cfg-antispam').value = String(config.antiSpam !== false)
    document.getElementById('cfg-cooldown').value = config.cooldown || 3000
}

async function saveConfig(e) {
    e.preventDefault()
    const config = {
        name: document.getElementById('cfg-name').value,
        mode: document.getElementById('cfg-mode').value,
        antiPrivate: document.getElementById('cfg-antipriv').value === 'true',
        antiSpam: document.getElementById('cfg-antispam').value === 'true',
        cooldown: parseInt(document.getElementById('cfg-cooldown').value)
    }

    try {
        const res = await fetch('/api/dashboard/config', {
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

async function uploadLogo(zone, input) {
    const file = input.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
        try {
            const res = await fetch('/api/dashboard/logo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ zone, imageBase64: e.target.result })
            })
            const data = await res.json()
            if (data.success) {
                document.getElementById(`preview-${zone}`).innerHTML = `<img src="${data.url}" alt="Logo">`
            }
        } catch (err) {
            alert('❌ Error subiendo logo')
        }
    }
    reader.readAsDataURL(file)
}

async function showGroupDetail(jid) {
    const group = currentGroups.find(g => g.jid === jid)
    if (!group) return

    document.getElementById('modal-group-name').textContent = group.name
    document.getElementById('modal-group-info').innerHTML = `
        <p><strong>JID:</strong> ${group.jid}</p>
        <p><strong>Participantes:</strong> ${group.participants}</p>
        <p><strong>Eres admin:</strong> ${group.isAdmin ? 'Sí ⭐' : 'No'}</p>
    `
    document.getElementById('group-modal').classList.add('active')
    document.getElementById('group-modal').dataset.jid = jid
    currentGroupJid = jid
}

function closeModal() {
    document.getElementById('group-modal').classList.remove('active')
}

function editGroupWelcome() {
    closeModal()
    showSection('welcome')
    document.getElementById('welcome-group-select').value = currentGroupJid
    loadWelcomeForGroup(currentGroupJid)
}

async function leaveGroup() {
    const jid = document.getElementById('group-modal').dataset.jid
    if (!confirm('¿Seguro que quieres salir de este grupo?')) return

    try {
        const res = await fetch('/api/dashboard/leave-group', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ groupJid: jid })
        })
        const data = await res.json()
        if (data.success) {
            closeModal()
            loadDashboard()
        }
    } catch (e) {
        alert('❌ Error')
    }
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.getElementById(`section-${id}`).classList.add('active')
    event.target.classList.add('active')
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    return `${h}h`
}

function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    window.location.href = '/login'
}