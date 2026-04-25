# 🌐 Public - Panel Web

Frontend de Asta Bot con landing page, autenticación y dashboards.

## 📂 Archivos

- `index.html` - Landing page
- `login.html` - Login/Registro
- `dashboard.html` - Panel usuario
- `admin.htm` - Panel admin
- `css/style.css` - Estilos
- `js/main.js` - Landing logic
- `js/auth.js` - Autenticación
- `js/dashboard.js` - Dashboard
- `js/admin.js` - Admin panel

## 🔐 Autenticación

- **Login**: `POST /api/auth/login`
- **Register**: `POST /api/auth/register`
- **Token**: Guardado en `localStorage.token`
- **Roles**: user, admin, owner

## 📱 Endpoints

- `GET /api/info` - Info del bot
- `GET /api/dashboard` - Datos dashboard
- `GET /api/admin/stats` - Estadísticas
- `GET /api/groups` - Lista de grupos

---

### **login.html** - Autenticación
**Propósito**: Login y registro de usuarios  
**Características**:
- Dos tabs: Login y Registro
- Formulario de login (usuario/contraseña)
- Formulario de registro (token/usuario/contraseña)
- Sistema de errores visual

**Flujo**:
1. Usuario ingresa credenciales
2. `POST /api/auth/login` o `POST /api/auth/register`
3. Recibe token JWT
4. Se redirige según rol (owner → admin, user → dashboard)

**Campos**:
| Campo | Tipo | Descripción |
|-------|------|-------------|
| username | text | Número de WhatsApp o usuario |
| password | password | Contraseña |
| token | text | Token de registro (solo registro) |

---

### **dashboard.html** - Panel de Usuario
**Propósito**: Panel personalizado para cada usuario  
**Secciones**:

1. **📊 Resumen (Overview)**
   - Estado del bot (conectado/desconectado)
   - Número de grupos
   - Uptime
   - Modo (público/privado)

2. **⚙️ Configuración (Config)**
   - Nombre del bot
   - Modo público/privado
   - Anti-privado
   - Anti-spam
   - Prefijo de comandos

3. **👥 Grupos (Groups)**
   - Lista de grupos donde está el bot
   - Estado de bienvenida por grupo
   - Configuración anti-link por grupo

4. **👋 Welcome**
   - Diseñador visual de mensaje de bienvenida
   - Personalización de colores, fuentes, posiciones
   - Preview en tiempo real

5. **👤 Perfil (Profile)**
   - Avatar del usuario
   - Biografía
   - Rol
   - Dinero (si aplica)

6. **🖼️ Logos**
   - Galería de logos del bot
   - Descarga/visualización

---

### **admin.htm** - Panel Administrativo
**Propósito**: Gestión completa del sistema (solo owners)  
**Secciones**:

1. **📊 Resumen**
   - Total de bots
   - Bots conectados
   - Usuarios web registrados
   - Uso de memoria

2. **🤖 Gestión de Bots**
   - Tabla con todos los bots
   - Estados (conectado/desconectado)
   - Acciones: Reiniciar, Reinstalar módulos, Eliminar

3. **👥 Gestión de Usuarios**
   - Crear usuarios
   - Ver perfiles
   - Editar roles
   - Eliminar usuarios

4. **💻 Consola**
   - Logs en tiempo real (WebSocket)
   - Filtrar por bot
   - Limpiar/Exportar logs

5. **👋 Diseñador Welcome**
   - Diseño avanzado de mensajes de bienvenida
   - Previsualización
   - Guardado de plantillas

---

## 🎨 Archivo CSS - style.css

**Tamaño**: 2,394 líneas  
**Sistema**: Design tokens + Componentes reutilizables

### Design Tokens

**Paleta de Colores**:
```css
--bg-primary: #0B0F19         /* Negro profundo */
--accent-primary: #06B6D4     /* Cyan neon */
--success: #10B981            /* Verde */
--danger: #EF4444             /* Rojo */
--text-primary: #F1F5F9       /* Blanco */
```

**Tipografía**:
```css
--font-display: 'Orbitron'    /* Títulos futuristas */
--font-body: 'Inter'          /* Cuerpo legible */
--font-mono: 'Fira Code'      /* Código */
```

**Animaciones**:
```css
--transition-fast: 150ms      /* Interacciones rápidas */
--transition-base: 250ms      /* Transiciones normales */
--transition-slow: 400ms      /* Animaciones lentas */
--transition-bounce: 300ms    /* Efectos bounce */
```

### Componentes Principales

| Componente | Clase | Uso |
|-----------|-------|-----|
| Botones | `.btn-glow`, `.btn-outline`, `.btn-danger` | Acciones |
| Cards | `.card`, `.feature-card`, `.stat-card` | Contenedores |
| Formularios | `.input-group`, `.form-grid` | Entrada de datos |
| Tablas | `.data-table` | Listados |
| Modales | `.modal`, `.modal-overlay` | Diálogos |

### Breakpoints Responsivos

```css
/* Mobile First */
600px   /* Tablets pequeños */
900px   /* Tablets */
1200px  /* Desktop */
1440px  /* Desktop grande */
```

### Animaciones GPU

- Transforms 3D para performance
- Will-change optimizado
- Backdrop-filter con fallback
- Gradients CSS nativos

---

## ⚙️ Scripts JavaScript

### **main.js** - Landing Page (139 líneas)

**Funciones principales**:

```javascript
loadInfo()              // Obtiene datos de /api/info
formatTime()            // Formatea segundos a h:m:s
animateStats()          // Animación contador de stats
scrollToSection()       // Scroll suave
switchTab()             // Cambiar entre tabs
requestQR()             // Generar QR para bot
```

**API Endpoints usados**:
- `GET /api/info` - Información del bot
- `POST /api/request-bot` - Solicitar nuevo bot

---

### **auth.js** - Autenticación (Variable)

**Funciones principales**:

```javascript
showForm(type)          // Mostrar login o registro
handleLogin(e)          // Procesar login
handleRegister(e)       // Procesar registro
redirectByRole(role)    // Redirigir según rol
showError(msg)          // Mostrar error
```

**API Endpoints**:
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/me` - Verificar sesión

**Storage**:
- `localStorage.token` - JWT del usuario
- `localStorage.role` - Rol (user/admin/owner)

---

### **dashboard.js** - Panel Usuario (329 líneas)

**Funciones principales**:

```javascript
loadDashboard()         // Cargar datos del bot
loadProfile()           // Cargar perfil del usuario
updateProfile()         // Actualizar bio/avatar
renderBotStatus()       // Mostrar estado del bot
loadGroups()            // Cargar lista de grupos
loadConfig()            // Cargar configuración
saveConfig()            // Guardar configuración
```

**Secciones dinámicas**:
```javascript
showSection(id)         // Mostrar/ocultar secciones
```

**API Endpoints**:
- `GET /api/dashboard` - Datos del dashboard
- `GET /api/profile` - Perfil del usuario
- `POST /api/profile/update` - Actualizar perfil
- `GET /api/groups` - Lista de grupos
- `POST /api/config/save` - Guardar configuración

---

### **admin.js** - Panel Admin (411 líneas)

**Funciones principales**:

```javascript
loadStats()             // Estadísticas del sistema
loadBots()              // Listar todos los bots
loadUsers()             // Listar usuarios web
setupConsole()          // Configurar consola
setupWelcomeDesigner()  // Inicializar diseñador
restartBot()            // Reiniciar bot
deleteBot()             // Eliminar bot
showCreateUserModal()   // Crear usuario
```

**WebSocket (Socket.io)**:
```javascript
socket.on('log')        // Recibir logs en tiempo real
socket.emit('subscribe-logs') // Suscribirse a logs
```

**API Endpoints**:
- `GET /api/admin/stats` - Estadísticas
- `GET /api/admin/bots` - Lista de bots
- `GET /api/admin/users` - Lista de usuarios
- `POST /api/admin/bots/restart/:jid` - Reiniciar bot
- `DELETE /api/admin/bots/:jid` - Eliminar bot

---

## 🔐 Sistema de Roles

| Rol | Acceso |
|-----|--------|
| **user** | Dashboard personal, configuración propia |
| **admin** | Panel administrativo, gestión de bots |
| **owner** | Control total, consola, logs |

---

## 🌐 Endpoints API Utilizados

### Públicos
```
GET  /api/info              # Información general del bot
POST /api/request-bot       # Solicitar nuevo bot
```

### Autenticación
```
POST /api/auth/login        # Login
POST /api/auth/register     # Registro
GET  /api/auth/me           # Datos del usuario actual
```

### Usuario
```
GET  /api/dashboard         # Datos del dashboard
GET  /api/profile           # Perfil del usuario
POST /api/profile/update    # Actualizar perfil
GET  /api/groups            # Lista de grupos
POST /api/config/save       # Guardar configuración
```

### Admin
```
GET  /api/admin/stats       # Estadísticas del sistema
GET  /api/admin/bots        # Lista de bots
GET  /api/admin/users       # Lista de usuarios
POST /api/admin/users       # Crear usuario
POST /api/admin/bots/restart/:jid  # Reiniciar bot
DELETE /api/admin/bots/:jid        # Eliminar bot
```

---

## 📱 Responsive Design

- **Mobile**: 100% - 599px
- **Tablet**: 600px - 1199px
- **Desktop**: 1200px+

### Adaptaciones
- Sidebar colapsable en móvil
- Grid → Stack en pantallas pequeñas
- Fuentes escalables con `clamp()`
- Touch-friendly en móvil (botones > 44px)

---

## 🚀 Uso

### Desarrollo Local
```bash
# Servir estáticamente
npx serve src/public

# O con Python
python -m http.server 8000 -d src/public
```

### Integración con Backend
1. Servidor Express sirve `/src/public` en rutas específicas
2. APIs en `/api/*` manejadas por backend
3. WebSocket en `/socket.io` para logs en tiempo real

---

## 🔧 Variables Globales Esperadas

Estos datos se cargan del backend via `/api/info`:

```javascript
data.logo           // URL del logo
data.icono          // URL del icono
data.stats          // { totalBots, totalUsers, uptime }
data.owners         // Array de creadores
```

---

## ✨ Características Especiales

✅ **Diseño Responsivo** - Mobile-first  
✅ **Animaciones GPU** - 60fps  
✅ **Dark Mode Nativo** - Optimizado para ojos  
✅ **Accesibilidad** - WCAG 2.1 AA  
✅ **Performance** - Lazy loading, minificación  
✅ **Security** - JWT, CORS, sanitización  

---

## 📝 Notas de Desarrollo

### Para agregar nueva sección al dashboard:
1. Agregar botón en sidebar
2. Crear sección con `id="section-{nombre}"`
3. Crear función `show{Nombre}()` en dashboard.js
4. Llamar API correspondiente en `loadDashboard()`

### Para agregar nuevo endpoint:
1. Crear ruta en backend
2. Llamar en JS: `fetch('/api/ruta')`
3. Manejar respuesta: `data.success ? ... : ...`

---

**Última actualización**: 25 de abril de 2026  
**Versión**: 2.0.0  
**Autor**: Fernando (Asta Bot Development Team)
