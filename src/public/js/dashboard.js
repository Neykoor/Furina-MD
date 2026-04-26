/* ═══════════════════════════════════════════════════
   ASTA BOT – dashboard.js  v2.0
   Panel de usuario completo
   ═══════════════════════════════════════════════════ */

const TOKEN = localStorage.getItem('token')
if (!TOKEN) window.location.href = '/login'

let currentBot     = null
let currentGroups  = []
let currentGroupJid = null
let chatHistory    = []
let hasBot         = false

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadInfo()
  loadDashboard()
  loadProfile()
  renderLogoZones()
  loadPresets()
  renderWelcomeCanvas()
})

/* ── Sidebar / navigation ─────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
  document.getElementById('sb-overlay').classList.toggle('active')
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('sb-overlay').classList.remove('active')
}

function showSection(id, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('sec-' + id).classList.add('active')
  if (btn) btn.classList.add('active')

  const titles = { overview:'Resumen', config:'Configuración', groups:'Grupos', welcome:'Welcome', logos:'Logos', downloads:'Descargas', chat:'Chat IA', profile:'Perfil' }
  document.getElementById('topbar-title').textContent = titles[id] || id

  closeSidebar()

  // Lock sections if no bot
  const botRequired = ['config','groups','welcome','logos']
  if (botRequired.includes(id)) {
    const noId = id === 'config' ? 'cfg-nobot' : id === 'groups' ? 'grp-nobot' : id === 'welcome' ? 'wlc-nobot' : 'logo-nobot'
    const mainId = id === 'config' ? 'config-form' : id === 'groups' ? 'groups-grid' : id === 'welcome' ? 'welcome-wrap' : 'logos-wrap'
    document.getElementById(noId).style.display    = hasBot ? 'none'  : 'block'
    document.getElementById(mainId).style.display  = hasBot ? 'block' : 'none'
  }
}

/* ── Info / logo ──────────────────────────────────── */
function loadInfo() {
  fetch('/api/info').then(r => r.json()).then(d => {
    if (d.logo) document.getElementById('sidebar-logo').src = d.logo
  }).catch(() => {})
}

/* ── Dashboard data ───────────────────────────────── */
async function loadDashboard() {
  try {
    const [dashRes, meRes] = await Promise.all([
      api('/api/dashboard'),
      api('/api/auth/me')
    ])

    if (meRes.success) {
      document.getElementById('user-name').textContent = meRes.user.username
      document.getElementById('role-pill').textContent = meRes.user.role.toUpperCase()
      document.getElementById('role-pill').className   = 'role-pill ' + meRes.user.role
      document.getElementById('ov-money').textContent  = '$' + (meRes.user.money || 0)
    }

    if (!dashRes.success || !dashRes.hasBot) {
      hasBot = false
      document.getElementById('no-bot-banner').style.display  = 'block'
      document.getElementById('bot-overview').style.display   = 'none'
      return
    }

    hasBot = true
    currentBot    = dashRes.bot
    currentGroups = dashRes.bot.groups || []

    document.getElementById('no-bot-banner').style.display = 'none'
    document.getElementById('bot-overview').style.display  = 'block'

    renderBotStatus(dashRes.bot)
    renderGroups(dashRes.bot.groups)
    fillConfigForm(dashRes.bot.config)
    fillWelcomeGroupSelect(dashRes.bot.groups)

  } catch (e) {
    console.error('loadDashboard:', e)
    if (e.status === 401) logout()
  }
}

function renderBotStatus(bot) {
  const connected = bot.status === 'connected'
  document.getElementById('sh-dot').textContent       = connected ? '🟢' : '🔴'
  document.getElementById('sh-name').textContent      = bot.name
  document.getElementById('sh-number').textContent    = '+' + bot.number
  const badge = document.getElementById('sh-badge')
  badge.textContent  = connected ? 'Conectado' : 'Desconectado'
  badge.className    = 'status-badge ' + (connected ? 'connected' : 'disconnected')

  document.getElementById('ov-groups').textContent = bot.groups?.length || 0
  document.getElementById('ov-uptime').textContent  = fmtTime(bot.uptime)
  document.getElementById('ov-mode').textContent    = bot.config.mode === 'private' ? 'Privado' : 'Público'
}

/* ── Bot actions ──────────────────────────────────── */
async function restartUserBot() {
  confirm2('¿Reiniciar el bot?', 'El bot se desconectará y reconectará automáticamente.', async () => {
    const d = await api('/api/dashboard/restart', 'POST')
    toast(d.success ? '✅ Reiniciando...' : '❌ ' + d.error, d.success ? 'success' : 'error')
  })
}

function confirmDeleteSession() {
  confirm2('¿Eliminar sesión?', 'Se borrará la sesión guardada. Tendrás que escanear el QR de nuevo.', async () => {
    const d = await api('/api/dashboard/session', 'DELETE')
    toast(d.success ? '✅ Sesión eliminada' : '❌ ' + d.error, d.success ? 'success' : 'error')
  })
}

function confirmDeleteBot() {
  confirm2('⚠️ ¿Eliminar bot permanentemente?', 'Esta acción NO se puede deshacer. Se eliminará la sesión y configuración.', async () => {
    const d = await api('/api/dashboard/bot', 'DELETE')
    if (d.success) { toast('✅ Bot eliminado', 'success'); setTimeout(() => loadDashboard(), 1500) }
    else toast('❌ ' + d.error, 'error')
  })
}

/* ── Config ───────────────────────────────────────── */
function fillConfigForm(config) {
  document.getElementById('cfg-name').value      = currentBot?.name || ''
  document.getElementById('cfg-mode').value      = config.mode || 'public'
  document.getElementById('cfg-antipriv').value  = String(config.antiPrivate || false)
  document.getElementById('cfg-antispam').value  = String(config.antiSpam !== false)
  document.getElementById('cfg-cooldown').value  = config.cooldown || 3000
}

async function saveConfig(e) {
  e.preventDefault()
  const body = {
    name:        document.getElementById('cfg-name').value,
    mode:        document.getElementById('cfg-mode').value,
    antiPrivate: document.getElementById('cfg-antipriv').value === 'true',
    antiSpam:    document.getElementById('cfg-antispam').value === 'true',
    cooldown:    parseInt(document.getElementById('cfg-cooldown').value)
  }
  const d = await api('/api/dashboard/config', 'POST', body)
  toast(d.success ? '✅ Configuración guardada' : '❌ ' + d.error, d.success ? 'success' : 'error')
}

/* ── Groups ───────────────────────────────────────── */
function renderGroups(groups) {
  const grid = document.getElementById('groups-grid')
  if (!groups?.length) {
    grid.innerHTML = '<p style="color:var(--text-muted)">No estás en ningún grupo.</p>'
    return
  }
  grid.innerHTML = groups.map(g => `
    <div class="group-card" onclick="openGroupModal('${g.jid}')">
      <h4>${esc(g.name)}</h4>
      <div class="group-meta">
        <span>👥 ${g.participants}</span>
        <span>${g.isAdmin ? '⭐ Admin' : '👤 Miembro'}</span>
      </div>
    </div>
  `).join('')
}

function openGroupModal(jid) {
  const g = currentGroups.find(x => x.jid === jid)
  if (!g) return
  currentGroupJid = jid
  document.getElementById('gm-name').textContent = g.name
  document.getElementById('gm-info').innerHTML = `
    <p style="color:var(--text-muted);font-size:.85rem;margin:.5rem 0"><strong>JID:</strong> ${g.jid}</p>
    <p style="color:var(--text-muted);font-size:.85rem;margin:.5rem 0"><strong>Participantes:</strong> ${g.participants}</p>
    <p style="color:var(--text-muted);font-size:.85rem;margin:.5rem 0"><strong>Eres admin:</strong> ${g.isAdmin ? 'Sí ⭐' : 'No'}</p>
  `
  openModal('group-modal')
}

async function leaveGroup() {
  if (!currentGroupJid) return
  const d = await api('/api/dashboard/leave-group', 'POST', { groupJid: currentGroupJid })
  if (d.success) { toast('✅ Saliste del grupo', 'success'); closeModal('group-modal'); loadDashboard() }
  else toast('❌ ' + d.error, 'error')
}

function goToGroupWelcome() {
  closeModal('group-modal')
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  const btn = document.querySelector('[data-section="welcome"]')
  if (btn) btn.classList.add('active')
  showSection('welcome', btn)
  document.getElementById('wlc-group-select').value = currentGroupJid
  loadWelcomeForGroup(currentGroupJid)
}

/* ── Welcome ──────────────────────────────────────── */
function fillWelcomeGroupSelect(groups) {
  const sel = document.getElementById('wlc-group-select')
  sel.innerHTML = '<option value="">— Selecciona un grupo —</option>'
  groups?.forEach(g => {
    sel.innerHTML += `<option value="${g.jid}">${esc(g.name)}</option>`
  })
}

async function loadWelcomeForGroup(jid) {
  const editor = document.getElementById('wlc-editor')
  if (!jid) { editor.style.display = 'none'; return }

  const d = await api(`/api/dashboard/welcome/${encodeURIComponent(jid)}`)
  if (!d.success) return

  const cfg = d.config
  document.getElementById('wlc-title').value        = cfg.titleText
  document.getElementById('wlc-title-color').value  = cfg.titleColor
  document.getElementById('wlc-name-color').value   = cfg.nameColor
  document.getElementById('wlc-group-color').value  = cfg.groupColor
  document.getElementById('wlc-border-color').value = cfg.borderColor
  document.getElementById('wlc-avatar-x').value     = cfg.avatarX
  document.getElementById('wlc-avatar-y').value     = cfg.avatarY
  document.getElementById('wlc-avatar-r').value     = cfg.avatarRadius
  document.getElementById('wlc-ax-val').textContent = cfg.avatarX
  document.getElementById('wlc-ay-val').textContent = cfg.avatarY
  document.getElementById('wlc-ar-val').textContent = cfg.avatarRadius
  document.getElementById('wlc-caption').value      = cfg.caption
  document.getElementById('wlc-caption-bye').value  = cfg.captionBye
  if (cfg.backgroundImage) document.getElementById('wlc-bg-url').value = cfg.backgroundImage

  editor.style.display = 'block'
  currentGroupJid = jid
  renderWelcomeCanvas()
}

async function saveWelcome() {
  if (!currentGroupJid) { toast('⚠️ Selecciona un grupo primero', 'error'); return }
  const body = {
    titleText:       document.getElementById('wlc-title').value,
    titleColor:      document.getElementById('wlc-title-color').value,
    nameColor:       document.getElementById('wlc-name-color').value,
    groupColor:      document.getElementById('wlc-group-color').value,
    borderColor:     document.getElementById('wlc-border-color').value,
    avatarX:         parseInt(document.getElementById('wlc-avatar-x').value),
    avatarY:         parseInt(document.getElementById('wlc-avatar-y').value),
    avatarRadius:    parseInt(document.getElementById('wlc-avatar-r').value),
    caption:         document.getElementById('wlc-caption').value,
    captionBye:      document.getElementById('wlc-caption-bye').value,
    backgroundImage: document.getElementById('wlc-bg-url').value
  }
  const d = await api(`/api/dashboard/welcome/${encodeURIComponent(currentGroupJid)}`, 'POST', body)
  toast(d.success ? '✅ Welcome guardado' : '❌ ' + d.error, d.success ? 'success' : 'error')
}

/* Canvas preview */
function renderWelcomeCanvas() {
  const canvas = document.getElementById('wlc-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height

  const bgUrl   = document.getElementById('wlc-bg-url')?.value || ''
  const title   = document.getElementById('wlc-title')?.value || '¡Bienvenido!'
  const tcol    = document.getElementById('wlc-title-color')?.value || '#00e5ff'
  const ncol    = document.getElementById('wlc-name-color')?.value || '#ffffff'
  const gcol    = document.getElementById('wlc-group-color')?.value || '#cccccc'
  const bcol    = document.getElementById('wlc-border-color')?.value || '#00e5ff'
  const ax      = parseInt(document.getElementById('wlc-avatar-x')?.value || 130)
  const ay      = parseInt(document.getElementById('wlc-avatar-y')?.value || 150)
  const ar      = parseInt(document.getElementById('wlc-avatar-r')?.value || 70)

  const draw = () => {
    ctx.clearRect(0, 0, W, H)

    // Background
    if (bgUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, 0, 0, W, H); drawElements() }
      img.onerror = () => { drawBg(); drawElements() }
      img.src = bgUrl
    } else { drawBg(); drawElements() }
  }

  const drawBg = () => {
    const grd = ctx.createLinearGradient(0, 0, W, H)
    grd.addColorStop(0, '#0B0F19'); grd.addColorStop(1, '#1a1a3e')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, W, H)
    // grid lines
    ctx.strokeStyle = 'rgba(0,217,255,.05)'; ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  }

  const drawElements = () => {
    // Avatar circle (placeholder)
    ctx.save()
    ctx.beginPath()
    ctx.arc(ax, ay, ar, 0, Math.PI * 2)
    ctx.fillStyle = '#2a2a4a'
    ctx.fill()
    ctx.strokeStyle = bcol; ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
    // Person icon
    ctx.fillStyle = 'rgba(255,255,255,.3)'
    ctx.font = `${ar * .9}px serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('👤', ax, ay)

    // Texts on right side
    const tx = ax + ar + 30, ty = H / 2 - 50
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'

    ctx.fillStyle = tcol
    ctx.font = `bold 28px 'Space Grotesk', sans-serif`
    ctx.fillText(title, tx, ty)

    ctx.fillStyle = ncol
    ctx.font = `600 20px 'Space Grotesk', sans-serif`
    ctx.fillText('+521234567890', tx, ty + 40)

    ctx.fillStyle = gcol
    ctx.font = `500 16px 'Space Grotesk', sans-serif`
    ctx.fillText('a Grupo de Prueba', tx, ty + 70)

    ctx.fillStyle = '#888'
    ctx.font = `400 13px 'Space Grotesk', sans-serif`
    ctx.fillText('ya somos 42 miembros', tx, ty + 98)
  }

  draw()
}

function downloadWelcomePreview() {
  const canvas = document.getElementById('wlc-canvas')
  const a = document.createElement('a')
  a.download = 'welcome-preview.png'
  a.href = canvas.toDataURL('image/png')
  a.click()
}

/* ── Logos ────────────────────────────────────────── */
const LOGO_ZONES = [
  { id: 'menu',    label: 'Menú Principal' },
  { id: 'gacha',   label: 'Menú Gacha' },
  { id: 'grupo',   label: 'Menú Grupo' },
  { id: 'welcome', label: 'Welcome' },
  { id: 'general', label: 'General' },
]

function renderLogoZones() {
  const grid = document.getElementById('logos-grid')
  grid.innerHTML = LOGO_ZONES.map(z => `
    <div class="logo-zone-card">
      <h4>${z.label}</h4>
      <div class="logo-preview-box" id="lpb-${z.id}"><span>Sin imagen</span></div>
      <input type="file" accept="image/*" onchange="uploadLogo('${z.id}', this)">
      <div class="logo-actions">
        <button onclick="deleteLogo('${z.id}')" class="btn-sm btn-danger" style="margin-top:.4rem">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('')

  // Load existing logos from bot config
  if (currentBot?.config?.logos) {
    Object.entries(currentBot.config.logos).forEach(([zone, url]) => {
      const box = document.getElementById('lpb-' + zone)
      if (box) box.innerHTML = `<img src="${url}" alt="${zone}">`
    })
  }
}

async function loadPresets() {
  const d = await api('/api/dashboard/logo-presets')
  const grid = document.getElementById('presets-grid')
  if (!d.success || !d.presets.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No hay logos predeterminados disponibles.</p>'
    return
  }
  grid.innerHTML = d.presets.map(p => `
    <div class="preset-item" onclick="applyPreset('${p.url}')">
      <img src="${p.url}" alt="${p.name}">
      <span>${p.name}</span>
    </div>
  `).join('')
}

function applyPreset(url) {
  const zone = prompt('¿En qué zona aplicar esta imagen?\n' + LOGO_ZONES.map(z => z.id).join(', '))
  if (!zone || !LOGO_ZONES.find(z => z.id === zone)) { toast('Zona inválida', 'error'); return }
  const box = document.getElementById('lpb-' + zone)
  if (box) box.innerHTML = `<img src="${url}" alt="preset">`
  // Save url as logo
  apiLogoUrl(zone, url)
}

async function apiLogoUrl(zone, url) {
  // Convert URL image to base64 for upload
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const reader = new FileReader()
    reader.onload = async e => {
      const d = await api('/api/dashboard/logo', 'POST', { zone, imageBase64: e.target.result })
      toast(d.success ? '✅ Logo actualizado' : '❌ ' + d.error, d.success ? 'success' : 'error')
    }
    reader.readAsDataURL(blob)
  } catch { toast('❌ No se pudo cargar la imagen', 'error') }
}

async function uploadLogo(zone, input) {
  const file = input.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast('❌ Imagen muy grande (máx 5MB)', 'error'); return }
  const reader = new FileReader()
  reader.onload = async e => {
    const d = await api('/api/dashboard/logo', 'POST', { zone, imageBase64: e.target.result })
    if (d.success) {
      const box = document.getElementById('lpb-' + zone)
      if (box) box.innerHTML = `<img src="${d.url}" alt="${zone}">`
      toast('✅ Logo subido correctamente', 'success')
    } else toast('❌ ' + d.error, 'error')
  }
  reader.readAsDataURL(file)
}

async function deleteLogo(zone) {
  const d = await api(`/api/dashboard/logo/${zone}`, 'DELETE')
  if (d.success) {
    const box = document.getElementById('lpb-' + zone)
    if (box) box.innerHTML = '<span>Sin imagen</span>'
    toast('✅ Logo eliminado', 'success')
  } else toast('❌ ' + d.error, 'error')
}

/* ── Downloads ────────────────────────────────────── */
async function startDownload() {
  const url  = document.getElementById('dl-url').value.trim()
  const type = document.getElementById('dl-type').value
  if (!url) { toast('⚠️ Ingresa una URL', 'error'); return }

  const resultEl = document.getElementById('dl-result')
  resultEl.style.display = 'block'
  resultEl.innerHTML = '<p style="color:var(--text-muted)">⏳ Procesando descarga...</p>'

  const d = await api('/api/download', 'POST', { url, type })
  if (d.success) {
    const data = d.data
    resultEl.innerHTML = `
      <div class="dl-title">✅ ${data.title || 'Descarga lista'}</div>
      ${data.thumbnail ? `<img src="${data.thumbnail}" style="width:120px;border-radius:8px;margin:.5rem 0">` : ''}
      ${data.url ? `<div class="dl-link"><a href="${data.url}" target="_blank" download>⬇️ Descargar archivo</a></div>` : ''}
      ${data.duration ? `<p style="color:var(--text-muted);font-size:.82rem">⏱️ ${data.duration}</p>` : ''}
    `
  } else {
    resultEl.innerHTML = `<p style="color:var(--danger)">❌ ${d.error}</p>`
  }
}

/* ── Chat IA ──────────────────────────────────────── */
async function sendChatMsg() {
  const input = document.getElementById('chat-input')
  const msg   = input.value.trim()
  if (!msg) return
  input.value = ''

  appendChatMsg(msg, 'user')
  chatHistory.push({ role: 'user', content: msg })

  const typing = appendChatMsg('...', 'bot', true)
  const d = await api('/api/chat/message', 'POST', { message: msg, history: chatHistory.slice(-12) })
  typing.remove()

  if (d.success) {
    const reply = d.reply
    chatHistory.push({ role: 'assistant', content: reply })
    appendChatMsg(reply, 'bot')
  } else {
    appendChatMsg('❌ Error: ' + d.error, 'bot')
  }
}

function appendChatMsg(text, role, isTyping = false) {
  const container = document.getElementById('chat-messages')
  const div = document.createElement('div')
  div.className = `chat-msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`

  const formatted = isTyping ? '<em style="color:var(--text-muted)">Escribiendo...</em>' : formatMsgText(text)
  div.innerHTML = `<div class="msg-bubble">${formatted}</div>`
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function formatMsgText(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

/* ── Profile ──────────────────────────────────────── */
async function loadProfile() {
  const d = await api('/api/profile')
  if (!d.success) return
  const p = d.profile
  document.getElementById('prf-username').textContent  = p.username
  document.getElementById('prf-phone').textContent     = '📱 ' + (p.profile?.phone || p.username)
  document.getElementById('prf-role').textContent      = '🔰 ' + (p.role || '').toUpperCase()
  document.getElementById('prf-money').textContent     = '💰 $' + (p.money || 0)
  document.getElementById('prf-bio').textContent       = p.profile?.bio || 'Sin biografía'
  document.getElementById('edit-bio').value            = p.profile?.bio || ''
  document.getElementById('edit-avatar').value         = p.profile?.avatar || ''

  if (p.profile?.avatar) {
    document.getElementById('profile-avatar-el').innerHTML = `<img src="${p.profile.avatar}" alt="Avatar">`
  }

  // Email status
  const emailDiv = document.getElementById('prf-email-status')
  if (p.email) {
    emailDiv.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">📧 ${p.email} ${p.emailVerified ? '✅' : '⚠️ No verificado'}</p>`
    if (p.emailVerified) {
      document.getElementById('email-verified-msg').style.display = 'block'
      document.getElementById('email-form').style.display = 'none'
    } else {
      document.getElementById('prf-email-input').value = p.email
    }
  }
}

async function updateProfile() {
  const bio    = document.getElementById('edit-bio').value
  const avatar = document.getElementById('edit-avatar').value
  const d      = await api('/api/profile/update', 'POST', { bio, avatar })
  if (d.success) { toast('✅ Perfil actualizado', 'success'); loadProfile() }
  else toast('❌ ' + d.error, 'error')
}

async function sendEmailCode() {
  const email = document.getElementById('prf-email-input').value.trim()
  if (!email) { toast('⚠️ Ingresa un correo', 'error'); return }
  document.getElementById('send-code-btn').textContent = '⏳ Enviando...'
  const d = await api('/api/profile/add-email', 'POST', { email })
  document.getElementById('send-code-btn').textContent = '📨 Enviar Código'
  if (d.success) {
    document.getElementById('code-field').style.display = 'block'
    toast('✅ Código enviado a ' + email, 'success')
  } else toast('❌ ' + d.error, 'error')
}

async function verifyEmailCode() {
  const email = document.getElementById('prf-email-input').value.trim()
  const code  = document.getElementById('prf-email-code').value.trim()
  if (!code) { toast('⚠️ Ingresa el código', 'error'); return }
  const d = await api('/api/profile/verify-email', 'POST', { email, code })
  if (d.success) { toast('✅ Correo verificado', 'success'); loadProfile() }
  else toast('❌ ' + d.error, 'error')
}

/* ── Modals ───────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open') }
function closeModal(id) { document.getElementById(id).classList.remove('open') }

function confirm2(title, msg, onOk) {
  document.getElementById('confirm-title').textContent = title
  document.getElementById('confirm-msg').textContent   = msg
  const btn = document.getElementById('confirm-ok')
  btn.onclick = () => { closeModal('confirm-modal'); onOk() }
  openModal('confirm-modal')
}

/* ── Toast ────────────────────────────────────────── */
function toast(msg, type = '') {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.className   = 'toast ' + type + ' show'
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 3200)
}

/* ── Utilities ────────────────────────────────────── */
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  window.location.href = '/login'
}

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

async function api(url, method = 'GET', body = null) {
  try {
    const opts = { method, headers: { 'Authorization': 'Bearer ' + TOKEN } }
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
    const r = await fetch(url, opts)
    if (r.status === 401) logout()
    return await r.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}
