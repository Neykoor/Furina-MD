// Landing Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    await loadInfo()
    animateStats()
})

async function loadInfo() {
    try {
        const res = await fetch('/api/info')
        const data = await res.json()

        if (data.success) {
            // Set images
            if (data.logo) {
                document.getElementById('logo-img').src = data.logo
                document.getElementById('icono-img').src = data.icono || data.logo
            }

            // Set stats
            document.getElementById('stat-bots').textContent = data.stats.totalBots
            document.getElementById('stat-users').textContent = data.stats.totalUsers
            document.getElementById('stat-uptime').textContent = formatTime(data.stats.uptime)

            // Render owners
            const ownersList = document.getElementById('owners-list')
            ownersList.innerHTML = data.owners.map(o => `
        <div class="owner-card">
          <div class="owner-avatar">👑</div>
          <div class="owner-name">${escapeHtml(o.name)}</div>
          <div class="owner-number">+${o.number}</div>
        </div>
      `).join('')
        }
    } catch (e) {
        console.error('Error cargando info:', e)
    }
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function animateStats() {
    const stats = document.querySelectorAll('.stat-number')
    stats.forEach(stat => {
        const target = parseInt(stat.textContent) || 0
        let current = 0
        const increment = target / 50
        const timer = setInterval(() => {
            current += increment
            if (current >= target) {
                stat.textContent = target
                clearInterval(timer)
            } else {
                stat.textContent = Math.floor(current)
            }
        }, 30)
    })
}

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' })
}

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))

    event.target.classList.add('active')
    document.getElementById(`tab-${type}`).classList.add('active')
}

async function requestQR() {
    const phone = document.getElementById('qr-phone').value.replace(/\D/g, '')
    if (!phone || phone.length < 10) {
        alert('Ingresa un número válido')
        return
    }

    const result = document.getElementById('qr-result')
    result.innerHTML = '<p>⏳ Generando QR...</p>'

    try {
        const res = await fetch('/api/request-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'qr', phoneNumber: phone })
        })
        const data = await res.json()

        if (data.success) {
            result.innerHTML = `
        <img src="${data.qrUrl}" class="qr-display" alt="QR Code">
        <p style="margin-top:1rem;color:var(--accent)">⏳ Expira en ${data.expiresIn}s</p>
        <p style="font-size:0.85rem;color:var(--text-muted)">Escanea con WhatsApp > ⋮ > Dispositivos vinculados</p>
      `
        } else {
            result.innerHTML = `<p style="color:var(--danger)">❌ ${data.error}</p>`
        }
    } catch (e) {
        result.innerHTML = `<p style="color:var(--danger)">❌ Error de conexión</p>`
    }
}

async function requestCode() {
    const phone = document.getElementById('code-phone').value.replace(/\D/g, '')
    if (!phone || phone.length < 10) {
        alert('Ingresa un número válido')
        return
    }

    const result = document.getElementById('code-result')
    result.innerHTML = '<p>⏳ Generando código...</p>'

    try {
        const res = await fetch('/api/request-bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'code', phoneNumber: phone })
        })
        const data = await res.json()

        if (data.success) {
            result.innerHTML = `
        <div class="code-display">${data.code}</div>
        <p style="margin-top:1rem;color:var(--text-secondary)">${data.instructions}</p>
        <button onclick="navigator.clipboard.writeText('${data.rawCode}')" class="btn-outline" style="margin-top:1rem">
          📋 Copiar código
        </button>
      `
        } else {
            result.innerHTML = `<p style="color:var(--danger)">❌ ${data.error}</p>`
        }
    } catch (e) {
        result.innerHTML = `<p style="color:var(--danger)">❌ Error de conexión</p>`
    }
}

function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}
