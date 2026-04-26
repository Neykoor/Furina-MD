const API_URL = ''

function showForm(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'))

    event.target.classList.add('active')
    document.getElementById(`${type}-form`).classList.add('active')

    document.getElementById('auth-title').textContent = type === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'
    document.getElementById('auth-subtitle').textContent = type === 'login'
        ? 'Accede a tu panel de control'
        : 'Regístrate con tu token'
}

async function handleLogin(e) {
    e.preventDefault()
    const user = document.getElementById('login-user').value.replace(/\D/g, '')
    const pass = document.getElementById('login-pass').value

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        })
        const data = await res.json()

        if (data.success) {
            localStorage.setItem('token', data.token)
            localStorage.setItem('role', data.role)
            redirectByRole(data.role)
        } else {
            showError(data.error)
        }
    } catch (e) {
        showError('Error de conexión')
    }
}

async function handleRegister(e) {
    e.preventDefault()
    const token = document.getElementById('reg-token').value.trim()
    const user = document.getElementById('reg-user').value.replace(/\D/g, '')
    const pass = document.getElementById('reg-pass').value

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, token })
        })
        const data = await res.json()

        if (data.success) {
            localStorage.setItem('token', data.token)
            localStorage.setItem('role', data.role)
            redirectByRole(data.role)
        } else {
            showError(data.error)
        }
    } catch (e) {
        showError('Error de conexión')
    }
}

function redirectByRole(role) {
    if (role === 'owner' || role === 'admin') {
        window.location.href = '/admin'
    } else {
        window.location.href = '/dashboard'
    }
}

function showError(msg) {
    const err = document.getElementById('auth-error')
    err.textContent = `❌ ${msg}`
    setTimeout(() => err.textContent = '', 5000)
}

// Auto redirect if already logged in
const token = localStorage.getItem('token')
if (token) {
    fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(r => r.json())
        .then(d => {
            if (d.success) redirectByRole(d.user.role)
        })
}