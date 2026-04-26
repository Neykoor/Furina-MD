'use strict'

const TOKEN = localStorage.getItem('token')
if (!TOKEN) window.location.href = '/login'

let currentBot = null
let currentGroups = []
let currentGroupJid = null
let chatHistory = []
let hasBot = false
let botCmds = []

document.addEventListener('DOMContentLoaded', () => {
    loadInfo()
    loadDashboard()
    loadProfile()
    loadChatCommands()
    renderLogoZones()
    renderWelcomeCanvas()
})

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open')
    document.getElementById('sb-overlay').classList.toggle('active')
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open')
    document.getElementById('sb-overlay').classList.remove('active')
}

function toggleSubmenu(id, btn) {
    const sub = document.getElementById(id)
    const arrow = btn?.querySelector('.sub-arrow')
    if (sub.style.display === 'none' || !sub.style.display) {
        sub.style.display = 'block'
        if (arrow) arrow.textContent = '▴'
    } else {
        sub.style.display = 'none'
        if (arrow) arrow.textContent = '▾'
    }
}

function showSection(id, btn) {
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
    const section = document.getElementById('sec-' + id)
    if (section) section.classList.add('active')
    if (btn) btn.classList.add('active')
    const titles = {
        'overview': 'Resumen', 'config': 'Configuración', 'groups-list': 'Mis Grupos',
        'welcome': 'Welcome', 'antilink': 'Anti-Link', 'logos': 'Logos',
        'downloads': 'Descargas', 'chat': 'Chat Bot', 'profile': 'Perfil'
    }
    document.getElementById('topbar-title').textContent = titles[id] || id
    closeSidebar()

    const botRequired = ['config', 'groups-list', 'welcome', 'antilink', 'logos']
    if (botRequired.includes(id)) {
        const mappedId = id === 'groups-list' ? 'groups-list' : id
        const noEl = document.getElementById(mappedId + '-nobot')
        const mainEl = document.getElementById(mappedId + '-main')
        if (noEl) noEl.style.display = hasBot ? 'none' : 'block'
        if (mainEl) mainEl.style.display = hasBot ? 'block' : 'none'
    }
}

function loadInfo() {
    fetch('/api/info').then(r => r.json()).then(d => {
        if (d.logo) document.getElementById('sidebar-logo').src = d.logo
    }).catch(() => { })
}

async function loadDashboard() {
    try {
        const [dashRes, meRes] = await Promise.all([api('/api/dashboard'), api('/api/auth/me')])

        if (meRes.success) {
            document.getElementById('user-name').textContent = meRes.user.profile?.displayName || meRes.user.username
            const rp = document.getElementById('role-pill')
            rp.textContent = meRes.user.role.toUpperCase()
            rp.className = 'role-pill ' + meRes.user.role
            document.getElementById('ov-money').textContent = '$' + (meRes.user.money || 0)
        }

        if (!dashRes.success || !dashRes.hasBot) {
            hasBot = false
            document.getElementById('no-bot-banner').style.display = 'block'
            document.getElementById('bot-overview').style.display = 'none'
            return
        }

        hasBot = true
        currentBot = dashRes.bot
        currentGroups = dashRes.bot.groups || []

        document.getElementById('no-bot-banner').style.display = 'none'
        document.getElementById('bot-overview').style.display = 'block'

        renderBotStatus(dashRes.bot)
        renderGroups(dashRes.bot.groups)
        fillConfigForm(dashRes.bot.config)
        fillWelcomeGroupSelect(dashRes.bot.groups)
        fillAntilinkGroupSelect(dashRes.bot.groups)

    } catch (e) {
        console.error('loadDashboard:', e)
    }
}

function renderBotStatus(bot) {
    const on = bot.status === 'connected'
    document.getElementById('sh-dot').textContent = on ? '🟢' : '🔴'
    document.getElementById('sh-name').textContent = bot.name
    document.getElementById('sh-number').textContent = '+' + bot.number
    const badge = document.getElementById('sh-badge')
    badge.textContent = on ? 'Conectado' : 'Desconectado'
    badge.className = 'status-badge ' + (on ? 'connected' : 'disconnected')
    document.getElementById('ov-groups').textContent = bot.groups?.length || 0
    document.getElementById('ov-uptime').textContent = fmtTime(bot.uptime)
    document.getElementById('ov-mode').textContent = bot.config.mode === 'private' ? 'Privado' : 'Público'
}

function goVincular() { window.location.href = '/vincular' }

async function restartUserBot() {
    confirm2('¿Reiniciar el bot?', 'El bot se reconectará automáticamente.', async () => {
        const d = await api('/api/dashboard/restart', 'POST')
        toast(d.success ? '✅ Reiniciando...' : '❌ ' + (d.error || d.message), d.success ? 'success' : 'error')
    })
}

function confirmDeleteSession() {
    confirm2('¿Eliminar sesión?', 'Tendrás que escanear el QR de nuevo en /vincular.', async () => {
        const d = await api('/api/dashboard/session', 'DELETE')
        toast(d.success ? '✅ Sesión eliminada' : '❌ ' + d.error, d.success ? 'success' : 'error')
    })
}

function confirmDeleteBot() {
    confirm2('⚠️ ¿Eliminar bot permanentemente?', 'Esta acción NO se puede deshacer.', async () => {
        const d = await api('/api/dashboard/bot', 'DELETE')
        if (d.success) { toast('✅ Bot eliminado', 'success'); setTimeout(() => loadDashboard(), 1200) }
        else toast('❌ ' + d.error, 'error')
    })
}

function fillConfigForm(cfg) {
    document.getElementById('cfg-name').value = currentBot?.name || ''
    document.getElementById('cfg-mode').value = cfg.mode || 'public'
    document.getElementById('cfg-antipriv').value = String(cfg.antiPrivate || false)
    document.getElementById('cfg-antispam').value = String(cfg.antiSpam !== false)
    document.getElementById('cfg-cooldown').value = cfg.cooldown || 3000
}

async function saveConfig(e) {
    e.preventDefault()
    const d = await api('/api/dashboard/config', 'POST', {
        name: document.getElementById('cfg-name').value,
        mode: document.getElementById('cfg-mode').value,
        antiPrivate: document.getElementById('cfg-antipriv').value === 'true',
        antiSpam: document.getElementById('cfg-antispam').value === 'true',
        cooldown: parseInt(document.getElementById('cfg-cooldown').value)
    })
    toast(d.success ? '✅ Configuración guardada' : '❌ ' + d.error, d.success ? 'success' : 'error')
}

function renderGroups(groups) {
    const grid = document.getElementById('groups-grid')
    if (!groups?.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No estás en ningún grupo.</p>'; return }
    grid.innerHTML = groups.map(g => `
        <div class="group-card" onclick="openGroupModal('${esc(g.jid)}')">
            <h4>${esc(g.name)}</h4>
            <div class="group-meta">
                <span>👥 ${g.participants}</span>
                <span>${g.isAdmin ? '⭐ Admin' : '👤 Miembro'}</span>
            </div>
            ${g.isAdmin ? '<span class="role-pill" style="font-size:.68rem;margin-top:.4rem;display:inline-block">ADMIN</span>' : ''}
        </div>`).join('')
}

function openGroupModal(jid) {
    const g = currentGroups.find(x => x.jid === jid)
    if (!g) return
    currentGroupJid = jid
    document.getElementById('gm-name').textContent = g.name
    document.getElementById('gm-info').innerHTML = `
        <p style="color:var(--text-muted);font-size:.84rem;margin:.4rem 0"><b>JID:</b> ${esc(g.jid)}</p>
        <p style="color:var(--text-muted);font-size:.84rem;margin:.4rem 0"><b>Participantes:</b> ${g.participants}</p>
        <p style="color:var(--text-muted);font-size:.84rem;margin:.4rem 0"><b>Eres admin:</b> ${g.isAdmin ? 'Sí ⭐' : 'No'}</p>
        ${g.desc ? `<p style="color:var(--text-muted);font-size:.84rem;margin:.4rem 0"><b>Descripción:</b> ${esc(g.desc)}</p>` : ''}`
    openModal('group-modal')
}

async function leaveGroup() {
    const d = await api('/api/dashboard/leave-group', 'POST', { groupJid: currentGroupJid })
    if (d.success) { toast('✅ Saliste del grupo', 'success'); closeModal('group-modal'); loadDashboard() }
    else toast('❌ ' + d.error, 'error')
}

function goToGroupWelcome() {
    closeModal('group-modal')
    showSection('welcome', document.querySelector('[data-section="welcome"]'))
    const sel = document.getElementById('wlc-group-select')
    if (sel) { sel.value = currentGroupJid; loadWelcomeForGroup(currentGroupJid) }
}

function fillWelcomeGroupSelect(groups) {
    const sel = document.getElementById('wlc-group-select')
    sel.innerHTML = '<option value="">— Selecciona un grupo —</option>'
    groups?.forEach(g => sel.innerHTML += `<option value="${esc(g.jid)}">${esc(g.name)}</option>`)
}

function fillAntilinkGroupSelect(groups) {
    const sel = document.getElementById('antilink-group-select')
    sel.innerHTML = '<option value="">— Selecciona un grupo —</option>'
    groups?.forEach(g => sel.innerHTML += `<option value="${esc(g.jid)}">${esc(g.name)}</option>`)
}

async function loadWelcomeForGroup(jid) {
    if (!jid) { document.getElementById('wlc-editor').style.display = 'none'; return }
    const d = await api(`/api/dashboard/welcome/${encodeURIComponent(jid)}`)
    if (!d.success) return
    const c = d.config
    setV('wlc-title', c.titleText)
    setV('wlc-title-color', c.titleColor)
    setV('wlc-name-color', c.nameColor)
    setV('wlc-group-color', c.groupColor)
    setV('wlc-border-color', c.borderColor)
    setV('wlc-border-width', c.borderWidth)
    setV('wlc-border-style', c.borderStyle)
    setV('wlc-avatar-x', c.avatarX); document.getElementById('wlc-ax-val').textContent = c.avatarX
    setV('wlc-avatar-y', c.avatarY); document.getElementById('wlc-ay-val').textContent = c.avatarY
    setV('wlc-avatar-r', c.avatarRadius); document.getElementById('wlc-ar-val').textContent = c.avatarRadius
    setV('wlc-avatar-shape', c.avatarShape)
    setV('wlc-bg1', c.bgGradient1)
    setV('wlc-bg2', c.bgGradient2)
    setV('wlc-overlay', c.overlayOpacity)
    setV('wlc-title-size', c.titleSize)
    setV('wlc-name-size', c.nameSize)
    setV('wlc-group-size', c.groupSize)
    setV('wlc-caption', c.caption)
    setV('wlc-caption-bye', c.captionBye)
    setV('wlc-bg-url', c.backgroundImage || '')
    document.getElementById('wlc-text-shadow').checked = c.textShadow !== false
    currentGroupJid = jid
    document.getElementById('wlc-editor').style.display = 'block'
    renderWelcomeCanvas()
}

async function saveWelcome() {
    if (!currentGroupJid) { toast('⚠️ Selecciona un grupo', 'error'); return }
    const body = {
        titleText: gV('wlc-title'),
        titleColor: gV('wlc-title-color'),
        nameColor: gV('wlc-name-color'),
        groupColor: gV('wlc-group-color'),
        membersColor: '#AAAAAA',
        borderColor: gV('wlc-border-color'),
        borderWidth: parseInt(gV('wlc-border-width')) || 4,
        borderStyle: gV('wlc-border-style'),
        avatarX: parseInt(gV('wlc-avatar-x')),
        avatarY: parseInt(gV('wlc-avatar-y')),
        avatarRadius: parseInt(gV('wlc-avatar-r')),
        avatarShape: gV('wlc-avatar-shape'),
        bgGradient1: gV('wlc-bg1'),
        bgGradient2: gV('wlc-bg2'),
        backgroundImage: gV('wlc-bg-url'),
        overlayOpacity: parseFloat(gV('wlc-overlay')),
        textShadow: document.getElementById('wlc-text-shadow')?.checked !== false,
        titleSize: parseInt(gV('wlc-title-size')) || 28,
        nameSize: parseInt(gV('wlc-name-size')) || 20,
        groupSize: parseInt(gV('wlc-group-size')) || 16,
        caption: gV('wlc-caption'),
        captionBye: gV('wlc-caption-bye')
    }
    const d = await api(`/api/dashboard/welcome/${encodeURIComponent(currentGroupJid)}`, 'POST', body)
    toast(d.success ? '✅ Welcome guardado' : '❌ ' + d.error, d.success ? 'success' : 'error')
}

async function loadAntilinkConfig(jid) {
    if (!jid) { document.getElementById('antilink-editor').style.display = 'none'; return }
    const d = await api(`/api/dashboard/antilink/${encodeURIComponent(jid)}`)
    if (!d.success) { document.getElementById('antilink-editor').style.display = 'block'; return }
    const c = d.config
    setV('al-enabled', String(c.enabled || false))
    setV('al-mode', c.mode || 'all')
    setV('al-action', c.action || 'delete')
    setV('al-warn-count', c.warnCount || 3)
    setV('al-exempt-admins', String(c.exemptAdmins !== false))
    setV('al-allowed', (c.allowedLinks || []).join(', '))
    setV('al-blocked', (c.blockedLinks || []).join(', '))
    currentGroupJid = jid
    document.getElementById('antilink-editor').style.display = 'block'
}

async function saveAntilinkConfig(e) {
    e.preventDefault()
    if (!currentGroupJid) { toast('⚠️ Selecciona un grupo', 'error'); return }
    const body = {
        enabled: gV('al-enabled') === 'true',
        mode: gV('al-mode'),
        action: gV('al-action'),
        warnCount: parseInt(gV('al-warn-count')) || 3,
        exemptAdmins: gV('al-exempt-admins') === 'true',
        allowedLinks: gV('al-allowed').split(',').map(l => l.trim()).filter(Boolean),
        blockedLinks: gV('al-blocked').split(',').map(l => l.trim()).filter(Boolean)
    }
    const d = await api(`/api/dashboard/antilink/${encodeURIComponent(currentGroupJid)}`, 'POST', body)
    const msgEl = document.getElementById('antilink-message')
    if (d.success) {
        msgEl.innerHTML = '<div style="padding:1rem;background:rgba(0,224,138,.1);border:1px solid rgba(0,224,138,.2);border-radius:8px;color:var(--success)">✅ Anti-Link guardado correctamente</div>'
        setTimeout(() => msgEl.innerHTML = '', 3000)
    } else {
        msgEl.innerHTML = `<div style="padding:1rem;background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.2);border-radius:8px;color:var(--danger)">❌ ${d.error}</div>`
    }
}

function renderWelcomeCanvas() {
    const canvas = document.getElementById('wlc-canvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    const title = gV('wlc-title') || '¡Bienvenido!'
    const tcol = gV('wlc-title-color') || '#00D9FF'
    const ncol = gV('wlc-name-color') || '#FFFFFF'
    const gcol = gV('wlc-group-color') || '#CCCCCC'
    const bcol = gV('wlc-border-color') || '#00D9FF'
    const bw = parseInt(gV('wlc-border-width')) || 4
    const bstyle = gV('wlc-border-style') || 'solid'
    const ax = parseInt(gV('wlc-avatar-x')) || 130
    const ay = parseInt(gV('wlc-avatar-y')) || 150
    const ar = parseInt(gV('wlc-avatar-r')) || 70
    const shape = gV('wlc-avatar-shape') || 'circle'
    const bg1 = gV('wlc-bg1') || '#0B0F19'
    const bg2 = gV('wlc-bg2') || '#1a1a3e'
    const overlay = parseFloat(gV('wlc-overlay')) || 0.4
    const tsize = parseInt(gV('wlc-title-size')) || 28
    const nsize = parseInt(gV('wlc-name-size')) || 20
    const gsize = parseInt(gV('wlc-group-size')) || 16
    const shadow = document.getElementById('wlc-text-shadow')?.checked !== false
    const bgUrl = gV('wlc-bg-url') || ''

    const drawAll = (bgImg = null) => {
        ctx.clearRect(0, 0, W, H)

        if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, W, H)
            ctx.fillStyle = `rgba(0,0,0,${overlay})`
            ctx.fillRect(0, 0, W, H)
        } else {
            const grd = ctx.createLinearGradient(0, 0, W, H)
            grd.addColorStop(0, bg1); grd.addColorStop(1, bg2)
            ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)
            ctx.strokeStyle = 'rgba(0,217,255,.04)'; ctx.lineWidth = 1
            for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
            for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
        }

        const glow = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar + 30)
        glow.addColorStop(0, bcol + '33'); glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow; ctx.fillRect(ax - ar - 30, ay - ar - 30, (ar + 30) * 2, (ar + 30) * 2)

        ctx.save()
        ctx.beginPath()
        if (shape === 'square' || shape === 'rounded') {
            const r2 = shape === 'rounded' ? 18 : 0
            roundRect(ctx, ax - ar, ay - ar, ar * 2, ar * 2, r2)
        } else {
            ctx.arc(ax, ay, ar, 0, Math.PI * 2)
        }
        ctx.fillStyle = '#2a2a4a'; ctx.fill()
        ctx.clip()
        ctx.font = `${ar * .88}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillText('👤', ax, ay)
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        if (shape === 'square' || shape === 'rounded') {
            const r2 = shape === 'rounded' ? 18 : 0
            roundRect(ctx, ax - ar, ay - ar, ar * 2, ar * 2, r2)
        } else {
            ctx.arc(ax, ay, ar, 0, Math.PI * 2)
        }
        ctx.strokeStyle = bcol; ctx.lineWidth = bw
        if (bstyle === 'dashed') ctx.setLineDash([8, 4])
        else if (bstyle === 'dotted') ctx.setLineDash([2, 4])
        else ctx.setLineDash([])
        ctx.stroke()
        ctx.restore()

        const tx = ax + ar + 30, ty = H / 2 - (tsize + nsize + gsize + 28) / 2

        const drawText = (text, x, y, size, color, bold = false) => {
            if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6 }
            ctx.fillStyle = color
            ctx.font = `${bold ? 700 : 500} ${size}px 'Space Grotesk', sans-serif`
            ctx.textAlign = 'left'; ctx.textBaseline = 'top'
            ctx.fillText(text, x, y)
            ctx.shadowBlur = 0
        }

        drawText(title, tx, ty, tsize, tcol, true)
        drawText('+521234567890', tx, ty + tsize + 8, nsize, ncol, true)
        drawText('a Grupo de Prueba', tx, ty + tsize + 8 + nsize + 6, gsize, gcol)
        drawText('42 miembros', tx, ty + tsize + 8 + nsize + 6 + gsize + 5, 13, '#888')
    }

    if (bgUrl) {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => drawAll(img)
        img.onerror = () => drawAll(null)
        img.src = bgUrl
    } else drawAll(null)
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}

function downloadWelcomePreview() {
    const canvas = document.getElementById('wlc-canvas')
    const a = document.createElement('a'); a.download = 'welcome-preview.png'; a.href = canvas.toDataURL('image/png'); a.click()
}

const LOGO_ZONES = [
    { id: 'menu', label: 'Menú Principal' },
    { id: 'gacha', label: 'Menú Gacha' },
    { id: 'grupo', label: 'Menú Grupo' },
    { id: 'welcome', label: 'Welcome' },
    { id: 'general', label: 'General' },
]

function renderLogoZones() {
    const grid = document.getElementById('logos-grid')
    if (!grid) return
    grid.innerHTML = LOGO_ZONES.map(z => `
        <div class="logo-zone-card">
            <h4>${z.label}</h4>
            <div class="logo-preview-box" id="lpb-${z.id}"><span>Sin imagen</span></div>
            <input type="file" accept="image/*" onchange="uploadLogo('${z.id}',this)">
            <div class="logo-actions">
                <button onclick="deleteLogo('${z.id}')" class="btn-sm btn-danger" style="margin-top:.4rem;width:100%">🗑️ Eliminar</button>
            </div>
        </div>`).join('')
    loadPresets()
}

async function loadPresets() {
    const d = await api('/api/dashboard/logo-presets')
    const grid = document.getElementById('presets-grid')
    if (!grid) return
    if (!d.success || !d.presets.length) { grid.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No hay logos predeterminados.</p>'; return }
    grid.innerHTML = d.presets.map(p => `
        <div class="preset-item" onclick="showPresetMenu('${esc(p.url)}','${esc(p.name)}')">
            <img src="${esc(p.url)}" alt="${esc(p.name)}">
            <span>${esc(p.name)}</span>
        </div>`).join('')
}

function showPresetMenu(url, name) {
    const zone = prompt(`¿En qué zona aplicar "${name}"?\n\nZonas: ${LOGO_ZONES.map(z => z.id).join(', ')}`)
    if (!zone || !LOGO_ZONES.find(z => z.id === zone)) { if (zone) toast('⚠️ Zona inválida', 'error'); return }
    fetchImageAsBase64(url).then(b64 => uploadLogoBase64(zone, b64))
}

async function fetchImageAsBase64(url) {
    const r = await fetch(url); const blob = await r.blob()
    return new Promise((res, rej) => { const reader = new FileReader(); reader.onload = e => res(e.target.result); reader.onerror = rej; reader.readAsDataURL(blob) })
}

async function uploadLogoBase64(zone, imageBase64) {
    const d = await api('/api/dashboard/logo', 'POST', { zone, imageBase64 })
    if (d.success) {
        const box = document.getElementById('lpb-' + zone)
        if (box) box.innerHTML = `<img src="${d.url}" alt="${zone}">`
        toast('✅ Logo aplicado', 'success')
    } else toast('❌ ' + d.error, 'error')
}

async function uploadLogo(zone, input) {
    const file = input.files[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('❌ Imagen muy grande (máx 5MB)', 'error'); return }
    const reader = new FileReader()
    reader.onload = async e => {
        const d = await api('/api/dashboard/logo', 'POST', { zone, imageBase64: e.target.result })
        if (d.success) {
            const box = document.getElementById('lpb-' + zone)
            if (box) box.innerHTML = `<img src="${d.url}" alt="${zone}">`
            toast('✅ Logo subido', 'success')
        } else toast('❌ ' + d.error, 'error')
    }
    reader.readAsDataURL(file)
}

async function deleteLogo(zone) {
    const d = await api(`/api/dashboard/logo/${zone}`, 'DELETE')
    if (d.success) { document.getElementById('lpb-' + zone).innerHTML = '<span>Sin imagen</span>'; toast('✅ Eliminado', 'success') }
    else toast('❌ ' + d.error, 'error')
}

async function startDownload() {
    const url = document.getElementById('dl-url')?.value.trim()
    const type = document.getElementById('dl-type')?.value
    if (!url) { toast('⚠️ Ingresa una URL', 'error'); return }
    const el = document.getElementById('dl-result')
    el.style.display = 'block'; el.innerHTML = '<p style="color:var(--text-muted)">⏳ Procesando...</p>'
    const d = await api('/api/download', 'POST', { url, type })
    if (d.success) {
        const data = d.data
        el.innerHTML = `<div class="dl-title">✅ ${esc(data.title || 'Listo')}</div>
            ${data.thumbnail ? `<img src="${data.thumbnail}" style="width:110px;border-radius:8px;margin:.5rem 0">` : ''}
            ${data.url ? `<div class="dl-link"><a href="${data.url}" target="_blank" download>⬇️ Descargar archivo</a></div>` : ''}
            ${data.duration ? `<p style="color:var(--text-muted);font-size:.82rem">⏱️ ${data.duration}</p>` : ''}`
    } else el.innerHTML = `<p style="color:var(--danger)">❌ ${esc(d.error)}</p>`
}

async function loadChatCommands() {
    const d = await api('/api/chat/commands')
    if (!d.success) return
    botCmds = d.commands || []
    const grid = document.getElementById('cmd-grid')
    if (!grid) return
    grid.innerHTML = botCmds.slice(0, 50).map(c => `
        <button class="cmd-chip" onclick="useCommand('${esc(c)}')">${esc(c)}</button>`).join('')
}

function useCommand(cmd) {
    const input = document.getElementById('chat-input')
    if (input) { input.value = cmd; input.focus() }
}

async function sendChatMsg() {
    const input = document.getElementById('chat-input')
    const msg = input?.value.trim()
    if (!msg) return
    input.value = ''

    const prefix = '.'
    const cmdName = (msg.startsWith(prefix) ? msg.slice(prefix.length) : msg).split(' ')[0].toLowerCase()

    if (!botCmds.map(c => c.toLowerCase()).includes(cmdName)) {
        appendMsg('❌ Este chat solo es para ejecutar comandos del bot.\nUsa *' + prefix + 'menu* para ver la lista de comandos disponibles.', 'bot')
        return
    }

    appendMsg(msg, 'user')
    chatHistory.push({ role: 'user', content: msg })

    const typing = appendMsg('Escribiendo...', 'bot', true)
    const d = await api('/api/chat/message', 'POST', { message: msg, history: chatHistory.slice(-12) })
    typing.remove()

    if (d.success) {
        chatHistory.push({ role: 'assistant', content: d.reply })
        appendMsg(d.reply, 'bot')
    } else appendMsg('❌ Error: ' + (d.error || 'desconocido'), 'bot')
}

function appendMsg(text, role, isTyping = false) {
    const c = document.getElementById('chat-messages')
    const div = document.createElement('div')
    div.className = `chat-msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`
    div.innerHTML = `<div class="msg-bubble">${isTyping ? `<em style="color:var(--text-muted)">${text}</em>` : fmtMsg(text)}</div>`
    c.appendChild(div); c.scrollTop = c.scrollHeight
    return div
}

function fmtMsg(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
}

async function loadProfile() {
    const d = await api('/api/profile')
    if (!d.success) return
    const p = d.profile
    setV('edit-display-name', p.displayName || '')
    setV('edit-bio', p.bio || '')
    setV('edit-avatar', p.avatar || '')
    document.getElementById('prf-username').textContent = p.username
    document.getElementById('prf-display').textContent = p.displayName || p.username
    document.getElementById('prf-phone').textContent = '📱 ' + (p.phone || p.username)
    document.getElementById('prf-role').textContent = '🔰 ' + (p.role || '').toUpperCase()
    document.getElementById('prf-money').textContent = '💰 $' + (p.money || 0)
    document.getElementById('prf-bio').textContent = p.bio || 'Sin biografía'
    if (p.avatar) document.getElementById('profile-avatar-el').innerHTML = `<img src="${esc(p.avatar)}" alt="Avatar">`

    const emailDiv = document.getElementById('prf-email-status')
    const emailForm = document.getElementById('email-form-wrap')
    const emailVMsg = document.getElementById('email-verified-msg')
    if (p.email && p.emailVerified) {
        emailDiv.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">📧 ${esc(p.email)} <span style="color:var(--success)">✅ verificado</span></p>`
        emailVMsg.style.display = 'block'
        emailForm.style.display = 'none'
        setV('prf-email-input', p.email)
    } else if (p.email && !p.emailVerified) {
        emailDiv.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">📧 ${esc(p.email)} <span style="color:var(--warning)">⚠️ no verificado</span></p>`
        setV('prf-email-input', p.email)
    }
}

async function updateProfile() {
    const d = await api('/api/profile/update', 'POST', {
        displayName: gV('edit-display-name'),
        bio: gV('edit-bio'),
        avatar: gV('edit-avatar')
    })
    if (d.success) { toast('✅ Perfil actualizado', 'success'); loadProfile() }
    else toast('❌ ' + d.error, 'error')
}

async function sendEmailCode() {
    const email = gV('prf-email-input').trim()
    if (!email.includes('@')) { toast('⚠️ Email inválido', 'error'); return }
    const btn = document.getElementById('send-code-btn')
    btn.disabled = true; btn.textContent = '⏳ Enviando...'
    const d = await api('/api/profile/email/send-code', 'POST', { email })
    btn.disabled = false; btn.textContent = '📨 Enviar Código'
    if (d.success) { document.getElementById('email-code-wrap').style.display = 'block'; toast('✅ Código enviado a ' + email, 'success') }
    else toast('❌ ' + d.error, 'error')
}

async function verifyEmailCode() {
    const email = gV('prf-email-input').trim()
    const code = gV('prf-email-code').trim()
    if (!code) { toast('⚠️ Ingresa el código', 'error'); return }
    const d = await api('/api/profile/email/verify', 'POST', { email, code })
    if (d.success) { toast('✅ Correo verificado', 'success'); loadProfile() }
    else toast('❌ ' + d.error, 'error')
}

async function removeEmail() {
    if (!confirm('¿Desvincular correo electrónico?')) return
    const d = await api('/api/profile/email', 'DELETE')
    if (d.success) { toast('✅ Correo eliminado', 'success'); loadProfile() }
    else toast('❌ ' + d.error, 'error')
}

function confirmDeleteAccount() {
    confirm2('⚠️ ¿Eliminar tu cuenta?', 'Se eliminará tu cuenta, bot vinculado y toda la información. Esta acción es IRREVERSIBLE.', async () => {
        const d = await api('/api/profile', 'DELETE')
        if (d.success) { localStorage.clear(); window.location.href = '/login' }
        else toast('❌ ' + d.error, 'error')
    })
}

function openModal(id) { document.getElementById(id)?.classList.add('open') }
function closeModal(id) { document.getElementById(id)?.classList.remove('open') }

function confirm2(title, msg, onOk) {
    document.getElementById('confirm-title').textContent = title
    document.getElementById('confirm-msg').textContent = msg
    const btn = document.getElementById('confirm-ok')
    btn.onclick = () => { closeModal('confirm-modal'); onOk() }
    openModal('confirm-modal')
}

function toast(msg, type = '') {
    const el = document.getElementById('toast')
    el.textContent = msg; el.className = 'toast ' + type + ' show'
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 3200)
}

function logout() { localStorage.clear(); window.location.href = '/login' }
const fmtTime = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m` }
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const gV = id => document.getElementById(id)?.value || ''
const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? '' }

async function api(url, method = 'GET', body = null) {
    try {
        const opts = { method, headers: { 'Authorization': 'Bearer ' + TOKEN } }
        if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
        const r = await fetch(url, opts)
        if (r.status === 401) { logout(); return {} }
        return await r.json()
    } catch (e) { return { success: false, error: e.message } }
}