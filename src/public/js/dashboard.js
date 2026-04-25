const token = localStorage.getItem('token')
if (!token) window.location.href = '/login'

let currentBot = null
let currentGroups = []
let currentGroupJid = null
let hasBot = false
let chatContext = []

// Default logos
const DEFAULT_LOGOS = {
    menu: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg',
    gacha: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg',
    grupo: 'https://raw.githubusercontent.com/Fer280809fl/Asta_bot/main/lib/astavs.jpg'
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard()
    loadProfile()
    loadLogo()
    loadDefaultLogos()
})

function loadLogo() {
    fetch('/api/info')
        .then(r => r.json())
        .then(d => {
            if (d.logo) document.getElementById('sidebar-logo').src = d.logo
        })
        .catch(() => {})
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
        document.getElementById('profile-email').textContent = p.email ? '📧 ' + p.email : '📧 Sin correo'
        document.getElementById('edit-bio').value = p.bio || ''
        document.getElementById('edit-avatar').value = p.avatar || ''
        document.getElementById('edit-email').value = p.email || ''

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
    const email = document.getElementById('edit-email').value

    try {
        const res = await fetch('/api/profile/update', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio, avatar, email })
        })
        const data = await res.json()
        if (data.success) {
            showToast('✅ Perfil actualizado', 'success')
            loadProfile()
        }
    } catch (e) {
        showToast('❌ Error al actualizar', 'error')
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

        // Load user info
        const meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const me = await meRes.json()
        if (me.success) {
            document.getElementById('welcome-text').textContent = `Hola, ${me.user.username}`
            document.getElementById('user-role').textContent = me.user.role
        }

        // Check if has bot
        hasBot = data.hasBot

        if (!hasBot) {
            // Show no bot UI
            document.getElementById('no-bot-banner').style.display = 'block'
            document.getElementById('no-bot-msg').style.display = 'block'
            document.getElementById('bot-status').style.display = 'none'
            document.getElementById('quick-actions').style.display = 'none'
            document.getElementById('bot-actions-quick').style.display = 'none'

            // Lock sections
            lockSection('config')
            lockSection('groups')
            lockSection('welcome')
            lockSection('logos')
            lockSection('bot-manage')
            return
        }

        // Hide no bot UI
        document.getElementById('no-bot-banner').style.display = 'none'
        document.getElementById('no-bot-msg').style.display = 'none'
        document.getElementById('bot-status').style.display = 'flex'
        document.getElementById('quick-actions').style.display = 'grid'
        document.getElementById('bot-actions-quick').style.display = 'flex'

        // Unlock sections
        unlockSection('config')
        unlockSection('groups')
        unlockSection('welcome')
        unlockSection('logos')
        unlockSection('bot-manage')

        currentBot = data.bot
        renderBotStatus(data.bot)
        renderGroups(data.bot.groups)
        fillConfigForm(data.bot.config)
        fillWelcomeGroups(data.bot.groups)
        loadLogos(data.bot.config?.logos || {})

        // Bot manage section
        document.getElementById('manage-bot-name').textContent = data.bot.name
        document.getElementById('manage-bot-number').textContent = '+' + data.bot.number
        const isConnected = data.bot.status === 'connected'
        document.getElementById('manage-status-dot').textContent = isConnected ? '🟢' : '🔴'
        document.getElementById('manage-status-text').textContent = isConnected ? 'Conectado' : 'Desconectado'
        document.getElementById('manage-status-text').className = `status-tag ${isConnected ? 'connected' : ''}`

    } catch (e) {
        console.error('Error:', e)
        showToast('❌ Error cargando dashboard', 'error')
    }
}

function lockSection(sectionId) {
    const locked = document.getElementById(sectionId + '-locked')
    const content = document.getElementById(sectionId + '-content') || document.getElementById(sectionId + '-form')
    if (locked) locked.style.display = 'block'
    if (content) content.style.display = 'none'
}

function unlockSection(sectionId) {
    const locked = document.getElementById(sectionId + '-locked')
    const content = document.getElementById(sectionId + '-content') || document.getElementById(sectionId + '-form')
    if (locked) locked.style.display = 'none'
    if (content) content.style.display = 'block'
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
    currentGroups = groups || []
    const container = document.getElementById('groups-list')
    if (!groups?.length) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">No estás en ningún grupo</p>'
        return
    }

    container.innerHTML = groups.map(g => `
        <div class="group-card" onclick="showGroupDetail('${g.jid}')">
            <h4>${escapeHtml(g.name)}</h4>
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
        select.innerHTML += `<option value="${g.jid}">${escapeHtml(g.name)}</option>`
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
        document.getElementById('dw-name-color').value = cfg.nameColor
        document.getElementById('dw-group-color').value = cfg.groupColor
        document.getElementById('dw-border-color').value = cfg.borderColor
        document.getElementById('dw-caption').value = cfg.caption
        document.getElementById('dw-caption-bye').value = cfg.captionBye

        document.getElementById('welcome-editor').style.display = 'block'
        currentGroupJid = groupJid
        updateWelcomePreview()
    } catch (e) {
        console.error('Error cargando welcome:', e)
    }
}

function updateWelcomePreview() {
    const title = document.getElementById('dw-title').value || '¡Bienvenido!'
    const titleColor = document.getElementById('dw-title-color').value
    const nameColor = document.getElementById('dw-name-color').value
    const groupColor = document.getElementById('dw-group-color').value
    const borderColor = document.getElementById('dw-border-color').value

    document.getElementById('preview-title').textContent = title
    document.getElementById('preview-title').style.color = titleColor
    document.getElementById('preview-name').style.color = nameColor
    document.getElementById('preview-group').style.color = groupColor
    document.getElementById('preview-avatar').style.borderColor = borderColor
}

async function saveDashboardWelcome() {
    if (!currentGroupJid) {
        showToast('Selecciona un grupo primero', 'warning')
        return
    }

    const config = {
        titleText: document.getElementById('dw-title').value,
        titleColor: document.getElementById('dw-title-color').value,
        nameColor: document.getElementById('dw-name-color').value,
        groupColor: document.getElementById('dw-group-color').value,
        borderColor: document.getElementById('dw-border-color').value,
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
        showToast(data.success ? '✅ Welcome guardado' : '❌ Error al guardar', data.success ? 'success' : 'error')
    } catch (e) {
        showToast('❌ Error de conexión', 'error')
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
    if (!hasBot) {
        showToast('🔒 Conecta tu bot primero', 'warning')
        return
    }

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
        showToast(data.success ? '✅ Configuración guardada' : '❌ Error', data.success ? 'success' : 'error')
    } catch (e) {
        showToast('❌ Error de conexión', 'error')
    }
}

// ==================== LOGOS ====================
function loadLogos(logos) {
    const zones = ['menu', 'gacha', 'grupo']
    zones.forEach(zone => {
        const url = logos[zone] || DEFAULT_LOGOS[zone]
        const preview = document.getElementById(`preview-${zone}`)
        if (url) {
            preview.innerHTML = `<img src="${url}" alt="Logo ${zone}" onerror="this.parentElement.innerHTML='<span>Error cargando</span>'">`
        } else {
            preview.innerHTML = '<span>Sin imagen</span>'
        }
    })
}

async function loadDefaultLogos() {
    try {
        const res = await fetch('/api/logos/default')
        const data = await res.json()
        const grid = document.getElementById('default-logos-grid')

        if (data.success && data.logos) {
            grid.innerHTML = Object.entries(data.logos).map(([name, url]) => `
                <div class="default-logo-item" onclick="selectDefaultLogo('${name}', '${url}')">
                    <img src="${url}" alt="${name}" loading="lazy">
                    <span>${name}</span>
                </div>
            `).join('')
        }
    } catch (e) {
        console.error('Error cargando logos default:', e)
    }
}

function selectDefaultLogo(name, url) {
    // Show selection modal or apply directly
    const zone = prompt('¿Para qué zona? (menu, gacha, grupo)')
    if (zone && ['menu', 'gacha', 'grupo'].includes(zone)) {
        useDefaultLogo(zone, url)
    }
}

async function uploadLogo(zone, input) {
    if (!hasBot) {
        showToast('🔒 Conecta tu bot primero', 'warning')
        return
    }

    const file = input.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
        showToast('❌ Imagen muy grande (máx 5MB)', 'error')
        return
    }

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
                showToast('✅ Logo subido', 'success')
            } else {
                showToast('❌ ' + (data.error || 'Error subiendo logo'), 'error')
            }
        } catch (err) {
            showToast('❌ Error subiendo logo', 'error')
        }
    }
    reader.readAsDataURL(file)
}

async function useDefaultLogo(zone, customUrl) {
    if (!hasBot) {
        showToast('🔒 Conecta tu bot primero', 'warning')
        return
    }

    try {
        const res = await fetch('/api/dashboard/logo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ zone, useDefault: true, customUrl })
        })
        const data = await res.json()
        if (data.success) {
            document.getElementById(`preview-${zone}`).innerHTML = `<img src="${data.url}" alt="Logo">`
            showToast('✅ Logo predeterminado aplicado', 'success')
        }
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

async function deleteLogo(zone) {
    if (!hasBot) {
        showToast('🔒 Conecta tu bot primero', 'warning')
        return
    }

    if (!confirm('¿Eliminar este logo?')) return

    try {
        const res = await fetch('/api/dashboard/logo/delete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ zone })
        })
        const data = await res.json()
        if (data.success) {
            document.getElementById(`preview-${zone}`).innerHTML = '<span>Sin imagen</span>'
            showToast('✅ Logo eliminado', 'success')
        }
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

// ==================== BOT MANAGEMENT ====================
async function restartBot() {
    if (!hasBot) {
        showToast('🔒 No tienes un bot vinculado', 'warning')
        return
    }

    if (!confirm('¿Reiniciar tu bot? Esto puede tomar unos segundos.')) return

    showToast('🔄 Reiniciando bot...', 'info')
    try {
        const res = await fetch('/api/dashboard/bot/restart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Bot reiniciado' : '❌ ' + data.error, data.success ? 'success' : 'error')
        if (data.success) setTimeout(() => loadDashboard(), 3000)
    } catch (e) {
        showToast('❌ Error reiniciando bot', 'error')
    }
}

async function clearBotCache() {
    if (!hasBot) {
        showToast('🔒 No tienes un bot vinculado', 'warning')
        return
    }

    if (!confirm('¿Limpiar caché del bot?')) return

    try {
        const res = await fetch('/api/dashboard/bot/clear-cache', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Caché limpiada' : '❌ Error', data.success ? 'success' : 'error')
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

async function deleteBot() {
    if (!hasBot) {
        showToast('🔒 No tienes un bot vinculado', 'warning')
        return
    }

    if (!confirm('⚠️ ¿ELIMINAR TU BOT PERMANENTEMENTE?\n\nEsta acción no se puede deshacer. Se eliminarán todos los datos de tu bot.')) return
    if (!confirm('¿Estás COMPLETAMENTE SEGURO?')) return

    try {
        const res = await fetch('/api/dashboard/bot/delete', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        showToast(data.success ? '✅ Bot eliminado' : '❌ ' + data.error, data.success ? 'success' : 'error')
        if (data.success) {
            hasBot = false
            setTimeout(() => loadDashboard(), 2000)
        }
    } catch (e) {
        showToast('❌ Error eliminando bot', 'error')
    }
}

// ==================== GROUP DETAIL ====================
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
            showToast('✅ Saliste del grupo', 'success')
        }
    } catch (e) {
        showToast('❌ Error', 'error')
    }
}

// ==================== CHAT ASTA ====================
async function sendChatMessage() {
    const input = document.getElementById('chat-input')
    const message = input.value.trim()
    if (!message) return

    // Add user message
    addChatMessage(message, 'user')
    input.value = ''

    // Show typing indicator
    showTypingIndicator()

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                context: chatContext
            })
        })
        const data = await res.json()

        hideTypingIndicator()

        if (data.success) {
            addChatMessage(data.response, 'bot')
            chatContext.push({ role: 'user', content: message })
            chatContext.push({ role: 'assistant', content: data.response })
            // Keep only last 10 messages
            if (chatContext.length > 10) chatContext = chatContext.slice(-10)
        } else {
            addChatMessage('❌ Lo siento, no pude procesar tu mensaje. Intenta de nuevo.', 'bot')
        }
    } catch (e) {
        hideTypingIndicator()
        addChatMessage('❌ Error de conexión. Verifica tu internet.', 'bot')
    }
}

function addChatMessage(text, type) {
    const container = document.getElementById('chat-messages')
    const div = document.createElement('div')
    div.className = `chat-message ${type}-message`

    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

    if (type === 'bot') {
        div.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
                <span class="message-time">${time}</span>
            </div>
        `
    } else {
        div.innerHTML = `
            <div class="message-content user-content">
                <p>${escapeHtml(text)}</p>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-avatar user-avatar">👤</div>
        `
    }

    container.appendChild(div)
    container.scrollTop = container.scrollHeight
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages')
    const div = document.createElement('div')
    div.id = 'typing-indicator'
    div.className = 'chat-message bot-message'
    div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `
    container.appendChild(div)
    container.scrollTop = container.scrollHeight
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator')
    if (indicator) indicator.remove()
}

// ==================== DOWNLOADS ====================
async function downloadMedia() {
    const url = document.getElementById('download-url').value.trim()
    const platform = document.getElementById('download-platform').value
    const format = document.getElementById('download-format').value
    const quality = document.getElementById('download-quality').value

    if (!url) {
        showToast('❌ Ingresa una URL', 'error')
        return
    }

    const btn = document.getElementById('btn-download')
    btn.disabled = true
    btn.textContent = '⏳ Descargando...'

    try {
        const res = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, type: format, quality, platform })
        })
        const data = await res.json()

        const resultDiv = document.getElementById('download-result')
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="download-success">
                    <h4>✅ ${escapeHtml(data.title)}</h4>
                    <p>Duración: ${data.duration || 'N/A'}</p>
                    <a href="${data.url}" target="_blank" class="btn-glow" download>
                        ⬇️ Descargar ${format === 'audio' ? 'Audio' : 'Video'}
                    </a>
                </div>
            `
        } else {
            resultDiv.innerHTML = `<div class="download-error">❌ ${data.error || 'Error al descargar'}</div>`
        }
    } catch (e) {
        showToast('❌ Error de conexión', 'error')
    } finally {
        btn.disabled = false
        btn.textContent = '⬇️ Descargar'
    }
}

// ==================== UI UTILS ====================
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.getElementById(`section-${id}`).classList.add('active')

    // Update nav active state
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

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function showToast(message, type = 'info') {
    // Create toast element
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
    localStorage.removeItem('username')
    window.location.href = '/login'
}

// Add toast animations
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
