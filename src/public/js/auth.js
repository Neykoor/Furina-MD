const API_URL = ''
let currentAuthMethod = 'credentials'
let emailVerified = false
let verifiedEmail = ''

function switchAuthMethod(method) {
    currentAuthMethod = method
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'))
    document.getElementById(`btn-${method}`).classList.add('active')

    if (method === 'credentials') {
        showForm('login')
    } else {
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'))
        document.getElementById('token-form').classList.add('active')
        document.getElementById('auth-title').textContent = 'Acceder con Token'
        document.getElementById('auth-subtitle').textContent = 'Ingresa tu token ASTA de 5 dígitos'
    }
}

function showForm(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'))

    if (type === 'login') {
        document.getElementById('login-form').classList.add('active')
        document.getElementById('auth-title').textContent = 'Iniciar Sesión'
        document.getElementById('auth-subtitle').textContent = 'Accede a tu panel de control'
    } else if (type === 'register') {
        document.getElementById('register-form').classList.add('active')
        document.getElementById('auth-title').textContent = 'Crear Cuenta'
        document.getElementById('auth-subtitle').textContent = 'Regístrate con tu token ASTA'
    }

    hideMessages()
}

async function handleLogin(e) {
    e.preventDefault()
    const user = document.getElementById('login-user').value.trim()
    const pass = document.getElementById('login-pass').value

    if (!user || !pass) {
        showError('Completa todos los campos')
        return
    }

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
            localStorage.setItem('username', data.username)
            showSuccess('✅ Inicio de sesión exitoso! Redirigiendo...')
            setTimeout(() => redirectByRole(data.role), 1000)
        } else {
            showError(data.error || 'Credenciales inválidas')
        }
    } catch (e) {
        showError('Error de conexión con el servidor')
    }
}

async function handleTokenLogin(e) {
    e.preventDefault()
    const token = document.getElementById('token-input').value.trim().toUpperCase()

    if (!token || !token.startsWith('ASTA-')) {
        showError('Token inválido. Debe tener formato ASTA-XXXXX')
        return
    }

    try {
        // Verify token first
        const verifyRes = await fetch(`/api/tokens/verify/${token}`)
        const verifyData = await verifyRes.json()

        if (!verifyData.valid) {
            showError(verifyData.error || 'Token inválido o expirado')
            return
        }

        // Check if user exists
        const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: verifyData.owner, 
                password: token 
            })
        })
        const loginData = await loginRes.json()

        if (loginData.success) {
            localStorage.setItem('token', loginData.token)
            localStorage.setItem('role', loginData.role)
            localStorage.setItem('username', loginData.username)
            showSuccess('✅ Token verificado! Redirigiendo...')
            setTimeout(() => redirectByRole(loginData.role), 1000)
        } else {
            // Token valid but no account - redirect to register
            showError('Token válido pero no tienes cuenta. Regístrate primero.')
            setTimeout(() => {
                document.getElementById('reg-token').value = token
                showForm('register')
            }, 2000)
        }
    } catch (e) {
        showError('Error de conexión')
    }
}

async function handleRegister(e) {
    e.preventDefault()
    const token = document.getElementById('reg-token').value.trim().toUpperCase()
    const user = document.getElementById('reg-user').value.replace(/\D/g, '')
    const pass = document.getElementById('reg-pass').value
    const passConfirm = document.getElementById('reg-pass-confirm').value
    const email = document.getElementById('reg-email').value.trim()

    // Validations
    if (!token || !user || !pass) {
        showError('Completa todos los campos obligatorios')
        return
    }

    if (!token.startsWith('ASTA-')) {
        showError('Token inválido. Formato: ASTA-XXXXX')
        return
    }

    if (pass.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres')
        return
    }

    if (pass !== passConfirm) {
        showError('Las contraseñas no coinciden')
        return
    }

    if (email && !emailVerified) {
        showError('Verifica tu correo electrónico primero o déjalo vacío')
        return
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: user, 
                password: pass, 
                token,
                email: emailVerified ? verifiedEmail : null
            })
        })
        const data = await res.json()

        if (data.success) {
            localStorage.setItem('token', data.token)
            localStorage.setItem('role', data.role)
            localStorage.setItem('username', data.username)
            showSuccess('✅ Cuenta creada exitosamente! Redirigiendo...')
            setTimeout(() => redirectByRole(data.role), 1500)
        } else {
            showError(data.error || 'Error al crear cuenta')
        }
    } catch (e) {
        showError('Error de conexión con el servidor')
    }
}

async function sendEmailCode() {
    const email = document.getElementById('reg-email').value.trim()

    if (!email || !email.includes('@')) {
        showError('Ingresa un correo válido')
        return
    }

    const btn = document.getElementById('btn-send-code')
    btn.disabled = true
    btn.textContent = '⏳ Enviando...'

    try {
        const res = await fetch('/api/email/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        const data = await res.json()

        if (data.success) {
            document.getElementById('email-code-group').style.display = 'block'
            showSuccess('📧 Código enviado a tu correo! Revisa tu bandeja de entrada.')
            verifiedEmail = email
        } else {
            showError(data.error || 'No se pudo enviar el código')
        }
    } catch (e) {
        showError('Error de conexión')
    } finally {
        btn.disabled = false
        btn.textContent = '📧 Enviar Código de Verificación'
    }
}

async function verifyEmailCode() {
    const email = verifiedEmail
    const code = document.getElementById('reg-email-code').value.trim()

    if (!code || code.length !== 6) {
        showError('Ingresa el código de 6 dígitos')
        return
    }

    try {
        const res = await fetch('/api/email/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        })
        const data = await res.json()

        if (data.success) {
            emailVerified = true
            showSuccess('✅ Email verificado correctamente!')
            document.getElementById('email-code-group').innerHTML = 
                '<p style="color: var(--success);">✅ Email verificado: ' + email + '</p>'
        } else {
            showError(data.error || 'Código incorrecto')
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
    const suc = document.getElementById('auth-success')
    suc.style.display = 'none'
    err.textContent = `❌ ${msg}`
    err.style.display = 'block'
    err.classList.add('active')
}

function showSuccess(msg) {
    const err = document.getElementById('auth-error')
    const suc = document.getElementById('auth-success')
    err.style.display = 'none'
    suc.textContent = msg
    suc.style.display = 'block'
}

function hideMessages() {
    document.getElementById('auth-error').style.display = 'none'
    document.getElementById('auth-success').style.display = 'none'
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
        .catch(() => {
            localStorage.clear()
        })
}

// Load logo
fetch('/api/info')
    .then(r => r.json())
    .then(d => {
        if (d.logo) document.getElementById('logo-img').src = d.logo
    })
    .catch(() => {})
