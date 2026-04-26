/* ═══════════════════════════════════════════════════
   ASTA BOT – admin.js  v2.0
   Panel de administración completo
   ═══════════════════════════════════════════════════ */

const TOKEN = localStorage.getItem('token')
const ROLE  = localStorage.getItem('role')
if (!TOKEN || (ROLE !== 'owner' && ROLE !== 'admin')) window.location.href = '/login'

const socket = typeof io !== 'undefined' ? io() : null

let selectedUser  = null
let aiHistory     = []
let includeDocCtx = false
let currentTokens = []

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadInfo()
  loadStats()
  loadBots()
  loadUsers()
  loadTokensList()
  setupConsole()
  renderAdminCanvas()
  if (socket) {
    socket.emit('subscribe-logs', TOKEN)
    socket.on('log', d => appendLog(d.type, d.message, d.time))
  }
})

/* ── Sidebar ──────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
  document.getElementById('sb-overlay').classList.toggle('active')
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open')
  document.getElementById('sb-overlay').classList.remove('active')
}

function showAdminSection(id, btn) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('admin-sec-' + id).classList.add('active')
  if (btn) btn.classList.add('active')
  closeSidebar()
}

/* ── Info / logo ──────────────────────────────────── */
function loadInfo() {
  fetch('/api/info').then(r => r.json()).then(d => {
    if (d.logo) document.getElementById('sidebar-logo').src = d.logo
  }).catch(() => {})
}

/* ── Stats ────────────────────────────────────────── */
async function loadStats() {
  const d = await api('/api/admin/stats')
  if (!d.success) return
  document.getElementById('a-total-bots').textContent = d.stats.totalBots
  document.getElementById('a-connected').textContent  = d.stats.connectedBots
  document.getElementById('a-total-users').textContent = d.stats.totalUsers
  document.getElementById('a-memory').textContent     = Math.round(d.stats.memory.heapUsed / 1024 / 1024) + 'MB'

  const sel = document.getElementById('console-target')
  if (sel) {
    sel.innerHTML = '<option value="all">📡 Todos los bots</option>'
    d.bots.forEach(b => sel.innerHTML += `<option value="${b.jid}">${esc(b.name)} (+${b.number})</option>`)
  }
}

/* ── Bots ─────────────────────────────────────────── */
async function loadBots() {
  const d = await api('/api/admin/bots')
  if (!d.success) return
  const tbody = document.getElementById('bots-tbody')
  if (!d.bots.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No hay bots registrados</td></tr>'; return }
  tbody.innerHTML = d.bots.map(b => `
    <tr>
      <td>${b.status === 'connected' ? '🟢' : '🔴'}</td>
      <td style="color:var(--text-primary);font-weight:600">${esc(b.name)}</td>
      <td style="font-family:var(--font-mono);font-size:.82rem">+${b.number}</td>
      <td style="color:var(--text-muted)">${esc(b.owner)}</td>
      <td>
        <div class="action-cell">
          <button onclick="restartBot('${b.jid}')" class="btn-sm btn-warn" title="Reiniciar">🔄</button>
          <button onclick="deleteSession('${b.jid}')" class="btn-sm btn-outline" title="Eliminar sesión">🗑️ Sesión</button>
          <button onclick="deleteBot('${b.jid}')" class="btn-sm btn-danger" title="Eliminar">❌</button>
        </div>
      </td>
    </tr>
  `).join('')
}

async function restartBot(jid) {
  if (!confirm('¿Reiniciar este bot?')) return
  const d = await api(`/api/admin/bot/${encodeURIComponent(jid)}/restart`, 'POST')
  toast(d.success ? '✅ Bot reiniciado' : '❌ ' + d.error, d.success ? 'success' : 'error')
  loadBots(); loadStats()
}

async function deleteSession(jid) {
  if (!confirm('¿Eliminar sesión de este bot?')) return
  const d = await api(`/api/admin/bot/${encodeURIComponent(jid)}/session`, 'DELETE')
  toast(d.success ? '✅ Sesión eliminada' : '❌ ' + d.error, d.success ? 'success' : 'error')
  loadBots()
}

async function deleteBot(jid) {
  if (!confirm('¿Eliminar este bot PERMANENTEMENTE?')) return
  const d = await api(`/api/admin/bot/${encodeURIComponent(jid)}`, 'DELETE')
  toast(d.success ? '✅ Bot eliminado' : '❌ ' + d.error, d.success ? 'success' : 'error')
  loadBots(); loadStats()
}

/* ── Users ────────────────────────────────────────── */
async function loadUsers() {
  const d = await api('/api/admin/users')
  if (!d.success) return
  const grid = document.getElementById('admin-users-grid')
  if (!d.users.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No hay usuarios registrados.</p>'; return }
  grid.innerHTML = d.users.map(u => `
    <div class="user-card" onclick="openUserAction('${u.username}')">
      <div class="user-card-top">
        <strong>${esc(u.username)}</strong>
        <span class="role-pill ${u.role}">${u.role}</span>
      </div>
      <p>💰 $${u.money || 0}</p>
      ${u.email ? `<p>📧 ${esc(u.email)} ${u.emailVerified ? '✅' : '⚠️'}</p>` : ''}
      <p style="margin-top:.3rem">📅 ${new Date(u.createdAt).toLocaleDateString()}</p>
    </div>
  `).join('')
}

function showCreateUserModal() { openModal('create-user-modal') }

function validateCreateUser() {
  const user = document.getElementById('nu-username').value.trim()
  const pass = document.getElementById('nu-password').value
  const userHint = document.getElementById('nu-user-hint')
  const passHint = document.getElementById('nu-pass-hint')
  let valid = true

  if (user.length < 3) {
    userHint.textContent = '⚠️ Mínimo 3 caracteres'
    userHint.className = 'field-hint error'
    valid = false
  } else {
    userHint.textContent = '✅ Válido'
    userHint.className = 'field-hint ok'
  }

  if (pass.length < 6) {
    passHint.textContent = '⚠️ Mínimo 6 caracteres'
    passHint.className = 'field-hint error'
    valid = false
  } else {
    passHint.textContent = '✅ Válido'
    passHint.className = 'field-hint ok'
  }

  document.getElementById('create-user-btn').disabled = !valid
  return valid
}

async function createUser() {
  if (!validateCreateUser()) return
  const username = document.getElementById('nu-username').value.trim()
  const password = document.getElementById('nu-password').value
  const role     = document.getElementById('nu-role').value
  const resultEl = document.getElementById('create-user-result')

  const d = await api('/api/admin/users', 'POST', { username, password, role })
  resultEl.style.display = 'block'

  if (d.success) {
    resultEl.innerHTML = `
      <div style="padding:1rem;background:rgba(0,224,138,.1);border:1px solid rgba(0,224,138,.2);border-radius:var(--radius);color:var(--success)">
        ✅ <strong>Usuario creado exitosamente</strong><br>
        <small>Usuario: <code>${esc(username)}</code> · Rol: ${role}</small><br>
        <small style="color:var(--text-muted)">El usuario puede iniciar sesión en /login con sus credenciales.</small>
      </div>`
    loadUsers()
    setTimeout(() => {
      closeModal('create-user-modal')
      resultEl.style.display = 'none'
      document.getElementById('nu-username').value = ''
      document.getElementById('nu-password').value = ''
    }, 2500)
  } else {
    resultEl.innerHTML = `<div style="padding:1rem;background:rgba(255,71,87,.1);border:1px solid rgba(255,71,87,.2);border-radius:var(--radius);color:var(--danger)">❌ ${d.error}</div>`
  }
}

function openUserAction(username) {
  selectedUser = username
  const el = document.getElementById('ua-title')
  el.textContent = '👤 ' + username
  document.getElementById('ua-info').innerHTML = `Usuario: <strong>${esc(username)}</strong>`
  document.getElementById('ua-amount').value = ''
  openModal('user-action-modal')
}

async function userMoneyAction(action) {
  if (!selectedUser) return
  const amount = parseInt(document.getElementById('ua-amount').value)
  if (isNaN(amount) || amount <= 0) { toast('⚠️ Ingresa un monto válido', 'error'); return }
  const d = await api(`/api/admin/users/${selectedUser}/money`, 'POST', { action, amount })
  if (d.success) {
    toast(`✅ Dinero actualizado → $${d.user.money}`, 'success')
    loadUsers(); closeModal('user-action-modal')
  } else toast('❌ ' + d.error, 'error')
}

async function deleteSelectedUser() {
  if (!selectedUser) return
  if (!confirm(`¿Eliminar permanentemente a ${selectedUser}?`)) return
  const d = await api(`/api/admin/users/${selectedUser}`, 'DELETE')
  if (d.success) {
    toast('✅ Usuario eliminado', 'success')
    loadUsers(); closeModal('user-action-modal'); loadStats()
  } else toast('❌ ' + d.error, 'error')
}

/* ── Tokens ───────────────────────────────────────── */
async function generateToken() {
  const role = document.getElementById('new-token-role').value
  const d    = await api('/api/admin/tokens/generate', 'POST', { role })
  if (d.success) {
    document.getElementById('token-result').style.display = 'flex'
    document.getElementById('token-value').textContent    = d.token
    toast('✅ Token generado: ' + d.token, 'success')
    loadTokensList()
  } else toast('❌ ' + d.error, 'error')
}

function copyToken() {
  const val = document.getElementById('token-value').textContent
  navigator.clipboard.writeText(val).then(() => toast('📋 Copiado: ' + val, 'success'))
}

async function loadTokensList() {
  // We fetch from the token verify endpoint indirectly – just show current tokens if exposed
  // For now, show placeholder message
  const list = document.getElementById('tokens-list')
  list.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">Los tokens generados expiran automáticamente en 24h. Genera uno nuevo arriba cuando lo necesites.</p>'
}

/* ── Console ──────────────────────────────────────── */
function setupConsole() {
  const inp = document.getElementById('console-input')
  if (inp) inp.addEventListener('keypress', e => { if (e.key === 'Enter') execCmd() })
}

function appendLog(type, message, time) {
  const out = document.getElementById('console-output')
  if (!out) return
  const line = document.createElement('span')
  line.className = 'log-line ' + (type || '')
  line.textContent = `[${new Date(time || Date.now()).toLocaleTimeString()}] ${message}`
  out.appendChild(line)
  out.appendChild(document.createElement('br'))
  out.scrollTop = out.scrollHeight
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '<span class="log-line system">$ Consola limpiada...</span>'
}

function exportLogs() {
  const text = document.getElementById('console-output').innerText
  const a = document.createElement('a')
  a.download = `asta-logs-${Date.now()}.txt`
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.click()
}

async function execCmd() {
  const target  = document.getElementById('console-target').value
  const command = document.getElementById('console-input').value.trim()
  if (!command) return
  appendLog('info', `> ${command} → ${target}`)
  const d = await api('/api/admin/exec', 'POST', { target, command })
  d.results?.forEach(r => appendLog(r.status === 'error' ? 'error' : 'system', `${r.jid}: ${r.status}${r.error ? ' – ' + r.error : ''}`))
  document.getElementById('console-input').value = ''
}

/* ── AI Admin ─────────────────────────────────────── */
function toggleDocContext() {
  includeDocCtx = !includeDocCtx
  const btn = document.getElementById('doc-ctx-btn')
  btn.textContent = includeDocCtx ? '📚 Contexto ON' : '📚 Contexto OFF'
  btn.style.borderColor = includeDocCtx ? 'var(--success)' : ''
  btn.style.color       = includeDocCtx ? 'var(--success)' : ''
  toast(includeDocCtx ? '📚 Contexto de documentos activado' : '📚 Contexto desactivado', 'success')
}

async function sendAdminAI() {
  const input = document.getElementById('admin-ai-input')
  const msg   = input.value.trim()
  if (!msg) return
  input.value = ''

  appendAIMsg(msg, 'user')
  aiHistory.push({ role: 'user', content: msg })

  const typing = appendAIMsg('⏳ Analizando...', 'bot', true)
  const d = await api('/api/admin/ai/chat', 'POST', { message: msg, history: aiHistory.slice(-12), includeDocuments: includeDocCtx })
  typing.remove()

  if (d.success) {
    aiHistory.push({ role: 'assistant', content: d.reply })
    appendAIMsg(d.reply, 'bot')
  } else appendAIMsg('❌ Error: ' + d.error, 'bot')
}

async function analyzeBot() {
  appendAIMsg('🔍 Analizando arquitectura del bot...', 'bot', true)
  const d = await api('/api/admin/ai/analyze', 'POST')
  document.querySelectorAll('.chat-msg').forEach((m, i, arr) => { if (i === arr.length - 1 && m.textContent.includes('Analizando')) m.remove() })
  if (d.success) appendAIMsg(d.analysis, 'bot')
  else appendAIMsg('❌ ' + d.error, 'bot')
}

async function listDocuments() {
  const panel = document.getElementById('ai-docs-panel')
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none'
  if (panel.style.display === 'none') return

  const d = await api('/api/admin/documents')
  const list = document.getElementById('ai-docs-list')
  if (!d.success || !d.documents.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:.82rem">No se encontraron documentos.</p>'
    return
  }
  list.innerHTML = d.documents.map(doc => `
    <div class="doc-item" onclick="loadDocument('${esc(doc.path)}')" title="${esc(doc.path)}">
      📄 ${doc.path} <span style="color:var(--text-muted)">(${Math.round(doc.size/1024)}kb)</span>
    </div>
  `).join('')
}

async function loadDocument(filePath) {
  appendAIMsg(`📄 Cargando: ${filePath}`, 'user')
  aiHistory.push({ role: 'user', content: `Por favor analiza el archivo: ${filePath}` })
  const typing = appendAIMsg('⏳ Leyendo documento...', 'bot', true)
  const d = await api('/api/admin/documents/' + encodeURIComponent(filePath))
  typing.remove()
  if (d.success) {
    const snippet = d.content.slice(0, 800) + (d.content.length > 800 ? '\n...[truncado]' : '')
    appendAIMsg(`\`\`\`\n${snippet}\n\`\`\``, 'bot')
    aiHistory.push({ role: 'assistant', content: 'Documento cargado: ' + snippet })
  } else appendAIMsg('❌ ' + d.error, 'bot')
}

function appendAIMsg(text, role, isTyping = false) {
  const container = document.getElementById('admin-ai-msgs')
  const div = document.createElement('div')
  div.className = `chat-msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`
  const formatted = isTyping ? `<em style="color:var(--text-muted)">${text}</em>` : formatAIText(text)
  div.innerHTML = `<div class="msg-bubble">${formatted}</div>`
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
  return div
}

function formatAIText(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

/* ── Welcome Admin Canvas ─────────────────────────── */
function renderAdminCanvas() {
  const canvas = document.getElementById('admin-wlc-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height

  const title  = document.getElementById('aw-title')?.value || '¡Bienvenido!'
  const tcol   = document.getElementById('aw-title-color')?.value || '#00e5ff'
  const ncol   = document.getElementById('aw-name-color')?.value || '#ffffff'
  const gcol   = document.getElementById('aw-group-color')?.value || '#cccccc'
  const bcol   = document.getElementById('aw-border-color')?.value || '#00e5ff'
  const ax     = parseInt(document.getElementById('aw-avatar-x')?.value || 130)
  const ay     = parseInt(document.getElementById('aw-avatar-y')?.value || 150)
  const ar     = parseInt(document.getElementById('aw-avatar-r')?.value || 70)

  ctx.clearRect(0, 0, W, H)

  // Background
  const grd = ctx.createLinearGradient(0, 0, W, H)
  grd.addColorStop(0, '#0B0F19'); grd.addColorStop(1, '#1a1a3e')
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H)

  // Grid
  ctx.strokeStyle = 'rgba(0,217,255,.05)'; ctx.lineWidth = 1
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

  // Avatar
  ctx.save()
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2)
  ctx.fillStyle = '#2a2a4a'; ctx.fill()
  ctx.strokeStyle = bcol; ctx.lineWidth = 4; ctx.stroke()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,.3)'
  ctx.font = `${ar * .9}px serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('👤', ax, ay)

  // Texts
  const tx = ax + ar + 30, ty = H/2 - 50
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = tcol; ctx.font = `bold 28px 'Space Grotesk', sans-serif`; ctx.fillText(title, tx, ty)
  ctx.fillStyle = ncol; ctx.font = `600 20px 'Space Grotesk', sans-serif`; ctx.fillText('+521234567890', tx, ty+40)
  ctx.fillStyle = gcol; ctx.font = `500 16px 'Space Grotesk', sans-serif`; ctx.fillText('a Grupo de Prueba', tx, ty+70)
  ctx.fillStyle = '#888'; ctx.font = `400 13px 'Space Grotesk', sans-serif`; ctx.fillText('ya somos 42 miembros', tx, ty+98)
}

function downloadAdminWelcome() {
  const canvas = document.getElementById('admin-wlc-canvas')
  const a = document.createElement('a')
  a.download = 'welcome-admin-preview.png'
  a.href = canvas.toDataURL('image/png')
  a.click()
}

async function saveAdminWelcome() {
  const groupJid = document.getElementById('aw-group-jid').value.trim()
  if (!groupJid) { toast('⚠️ Ingresa el JID del grupo', 'error'); return }
  const body = {
    titleText:    document.getElementById('aw-title').value,
    titleColor:   document.getElementById('aw-title-color').value,
    nameColor:    document.getElementById('aw-name-color').value,
    groupColor:   document.getElementById('aw-group-color').value,
    borderColor:  document.getElementById('aw-border-color').value,
    avatarX:      parseInt(document.getElementById('aw-avatar-x').value),
    avatarY:      parseInt(document.getElementById('aw-avatar-y').value),
    avatarRadius: parseInt(document.getElementById('aw-avatar-r').value),
    caption:      document.getElementById('aw-caption').value,
    captionBye:   document.getElementById('aw-caption-bye').value
  }
  const d = await api(`/api/dashboard/welcome/${encodeURIComponent(groupJid)}`, 'POST', body)
  toast(d.success ? '✅ Welcome guardado' : '❌ ' + d.error, d.success ? 'success' : 'error')
}

/* ── Modals ───────────────────────────────────────── */
function openModal(id)  { document.getElementById(id)?.classList.add('open') }
function closeModal(id) { document.getElementById(id)?.classList.remove('open') }

/* ── Toast ────────────────────────────────────────── */
function toast(msg, type = '') {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = msg
  el.className   = 'toast ' + type + ' show'
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('show'), 3500)
}

/* ── Utils ────────────────────────────────────────── */
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  window.location.href = '/login'
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
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
