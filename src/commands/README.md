# 🤖 Commands - Sistema de Comandos

Comandos organizados por categoría con permisos y carga dinámica.

## 📂 Estructura

```
commands/
├── general/          # Públicos: ping, testlid
├── owner/            # Admin: token, crearuser, update
├── group/            # Grupos: welcome, antilink, group-events
├── menus/            # menu-all.js
├── serbot/           # mibot, serbot, delsub
└── funciones/        # antilink-detector, botones
```

## 📝 Crear Comando

**Template básico**:
```javascript
let handler = async (m, { conn, args, usedPrefix, command }) => {
    await conn.sendMessage(m.chat, { text: 'respuesta' }, { quoted: m })
}

handler.help = ['comando']
handler.tags = ['categoría']
handler.command = ['cmd', 'alias']
handler.owner = false

export default handler
```

## 🔐 Permisos

- `handler.owner = true` - Solo owner
- `handler.group = true` - Solo en grupos
- `handler.admin = true` - Solo admin del grupo
- `handler.private = true` - Solo privado

## 🔄 Ciclo de Vida

1. User envía mensaje
2. lib/loader.js busca comando
3. Valida permisos
4. Ejecuta handler
5. Envía respuesta

## 📦 Objeto Message (m)

- `m.chat` - ID del chat
- `m.sender` - ID del usuario
- `m.isOwner` - ¿Es owner?
- `m.isGroup` - ¿Es grupo?
- `m.body` - Texto del mensaje

## 🔗 Objeto Connection (conn)

- `conn.sendMessage(chat, content, options)` - Enviar
- `conn.groupMetadata(jid)` - Info grupo
- `conn.profilePictureUrl(jid)` - Avatar
handler.command = ['cmd', 'alias']  // Comando y alias
handler.owner = false               // ¿Solo owner?
handler.group = false               // ¿Solo grupo?
handler.private = false             // ¿Solo privado?

export default handler
```

---

## 📋 Comandos por Categoría

### 🔧 **general/** - Comandos Públicos

#### **ping.js** - Verificar latencia
**Comando**: `.ping`, `.speed`, `.p`  
**Acceso**: Público  
**Descripción**: Muestra latencia, uptime, memoria y datos del bot

**Uso**:
```
.ping
```

**Respuesta**:
```
╭━━━━━━━━━━━━━━━━━━╮
│  🏓 PING — Asta-Bot
╰━━━━━━━━━━━━━━━━━━╯

📶 Latencia
 🟢 Bot · 245 ms

⚙️ Sistema
 ⏱️ Uptime · 3d 4h 25m
 💾 RAM · 125.5 / 256 MB

🤖 Bot
 📛 Nombre · Asta-Bot
 📱 Número · 521234567890
 🏷️ Versión · v2.0.0
 🔑 Prefijo · .
 🔗 Sub-bots · 5

> ✦ Powered by Fernando
```

**Metricas mostradas**:
- Latencia de mensaje (ms)
- Uptime del sistema
- Memoria RAM actual/total
- Nombre, número y versión del bot
- Cantidad de sub-bots activos

---

#### **testlid.js** - Test LidSync v5
**Comando**: `.testlid`, `.verlid`  
**Acceso**: Público  
**Descripción**: Resuelve IDs de usuario con sistema LidSync

**Uso**:
```
.testlid              # Tester a sí mismo
.testlid @usuario     # Tester a usuario mencionado
```

**Respuesta**:
```
🔍 Prueba LidSync v5

ID Original: 5214183357841@s.whatsapp.net
ID Resuelto: 5214183357841@c.us
```

**Utilidad**: Depuración de IDs de WhatsApp, resolución de contactos

---

### 👑 **owner/** - Comandos del Propietario

#### **token.js** - Generar Token Web
**Comando**: `.token [rol]`  
**Acceso**: Solo propietario  
**Descripción**: Genera token de registro para panel web (24h válido)

**Uso**:
```
.token              # Token con rol 'user'
.token admin        # Token con rol 'admin' (solo owner)
```

**Respuesta**:
```
🔑 Token de Registro Web

Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Rol: USER
Vinculado a: 5214183357841
Expira: 24 horas

Usa este token en: https://tudominio.com/login

⚠️ No compartas este token
```

**Roles disponibles**:
- `user` - Acceso a dashboard personal
- `admin` - Acceso a panel administrativo (solo owner)

**Implementación**:
- Genera JWT de 32 bytes aleatorios
- Hace POST a `/api/tokens/create` con rol
- Vincula el token al número del owner
- Token expira en 24 horas

---

#### **crearuser.js** - Crear Usuario Web
**Comando**: `.crearuser <user> <numero> <contraseña> [rol]`  
**Acceso**: Solo propietario  
**Descripción**: Crea usuario web directamente desde WhatsApp

**Uso**:
```
.crearuser fernando 521234567890 MiPass123 user
.crearuser admin 523456789012 AdminPass admin
```

**Respuesta**:
```
✅ Usuario creado exitosamente

👤 Usuario: fernando
📱 Número: 521234567890
🔐 Rol: user
🔑 Contraseña: ||Mipass123||
```

**Parámetros**:
| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| user | Nombre de usuario | fernando |
| numero | Número WhatsApp | 521234567890 |
| contraseña | Contraseña inicial | Mipass123 |
| rol | user/admin/owner | user |

**API Call**:
```javascript
POST http://localhost:24683/api/admin/users
Authorization: Bearer OWNER_SECRET
{
  "username": "521234567890",
  "password": "Mipass123",
  "role": "user"
}
```

---

#### **update.js** - Actualizar Bot (182 líneas)
**Comando**: `.update`  
**Acceso**: Solo propietario  
**Descripción**: Actualiza el bot desde repositorio Git

**Uso**:
```
.update
```

**Proceso**:
1. Verifica/inicializa repositorio Git
2. Valida URL remota
3. Obtiene rama actual
4. Descarga cambios (`git fetch`)
5. Comprueba commits nuevos
6. Si hay actualizaciones:
   - Descarga cambios (`git pull`)
   - Instala nuevas dependencias (`npm install`)
   - Reinicia el bot
7. Si está actualizado: notifica al usuario

**Respuesta exitosa**:
```
✅ Bot actualizado

📂 Rama: main
📥 Commits descargados: 3
📦 Módulos actualizados
🔄 Bot reiniciando...

Cambios:
- Fix: Mejorar rendimiento de ping
- Feat: Nuevo sistema de welcome
- Docs: Actualizar README
```

**Manejo de errores**:
- Si no hay conexión a Git → error con sugerencias
- Si rama no existe → usa rama por defecto
- Si falla npm install → muestra logs

**Repositorio**:
- URL por defecto: `https://github.com/Fer2809fl/asta-.git`
- Configurable en `global.github`

---

### 👥 **group/** - Comandos de Grupo

#### **welcome.js** - Mensaje de Bienvenida (328 líneas)
**Comando**: `.welcome`, `.welcome on/off`  
**Acceso**: Admins del grupo  
**Descripción**: Sistema completo de bienvenida con imagen customizable

**Características**:
- Imagen de bienvenida con avatar del usuario
- Textos personalizables (fuente, color, posición)
- Efectos visuales (bordes, degradados)
- Mensaje de despedida opcional
- Configuración por grupo

**Interfaz gráfica**:
- Ancho/alto canvas
- Posición avatar (x, y, radio, borde)
- Texto: bienvenida, nombre, grupo, miembros
- Línea decorativa personalizable

**Persistencia**:
Guarda configuración en `data/welcome.json`:
```json
{
  "120363399175402285@g.us": {
    "activo": true,
    "width": 800,
    "height": 400,
    "avatar": {
      "x": 130,
      "y": 200,
      "radio": 90,
      "borde": { "color": "#00e5ff", "grosor": 5 }
    },
    "textos": {
      "bienvenida": { "texto": "¡Bienvenido!" }
    }
  }
}
```

**Ejemplo de uso**:
```
.welcome on          # Activar welcome
.welcome off         # Desactivar welcome

# El bot enviará automaticamente:
# 👋 ¡Bienvenido @5214183357841 a Grupo Importante!
# Ya somos 125 miembros.
# [Imagen con avatar del usuario]
```

**Requisitos**:
- Canvas library (`@napi-rs/canvas`)
- Acceso a fotos de perfil
- Permisos de admin en grupo

---

#### **antilink.js** - Detector Anti-Link
**Comando**: `.antilink on/off`  
**Acceso**: Admins del grupo  
**Descripción**: Elimina automáticamente mensajes con links

**Uso**:
```
.antilink on         # Activar anti-link
.antilink off        # Desactivar anti-link
```

---

#### **group-events.js** - Eventos de Grupo
**Descripción**: Responde a eventos del grupo
- Miembro se une
- Miembro sale
- Alguien es promovido a admin
- Alguien pierde admin

---

### 🎮 **menus/** - Menús Principales

#### **menu-all.js** - Menú General
**Comando**: `.menu`, `.help`, `.?`  
**Acceso**: Público  
**Descripción**: Muestra lista de todos los comandos disponibles

**Formato**:
```
🤖 ASTA BOT - MENÚ PRINCIPAL

📋 GENERAL
  .ping    - Latencia
  .menu    - Este menú
  
📊 INFORMACIÓN
  .testlid - Test LidSync

👥 GRUPOS
  .welcome - Bienvenida

👑 PROPIETARIO
  .update  - Actualizar bot
  .token   - Generar token web

... más comandos
```

---

### 🔌 **serbot/** - Gestión de Sub-Bots

Sistema para crear y administrar múltiples instancias del bot.

#### **mibot.js** - Crear Sub-Bot Personal
**Comando**: `.mibot`, `.qr`  
**Acceso**: Públicas (requiere token/suscripción)  
**Descripción**: Crea un sub-bot personal del usuario

**Proceso**:
1. Genera código único
2. Usuario escanea QR
3. Bot se autentica
4. Se vincula al usuario
5. Dashboard personalizado

---

#### **serbot.js** - Listar Sub-Bots
**Comando**: `.serbot`, `.mybots`  
**Acceso**: Público  
**Descripción**: Muestra todos los sub-bots del usuario

**Respuesta**:
```
🤖 TUS BOTS

1. Mi Bot Principal
   Status: 🟢 Conectado
   Grupos: 12
   
2. Bot de Prueba
   Status: 🔴 Desconectado
   Grupos: 3
```

---

#### **subbotlist.js** - Bots Disponibles
**Comando**: `.subbotlist`  
**Acceso**: Público  
**Descripción**: Lista bots disponibles para solicitar

---

#### **delsub.js** - Eliminar Sub-Bot
**Comando**: `.delsub <id>`  
**Acceso**: Owner del sub-bot  
**Descripción**: Elimina un sub-bot permanentemente

---

### 🛠️ **funciones/** - Funciones Auxiliares

#### **antilink-detector.js**
**Propósito**: Detección de URLs en mensajes  
**Función**: `detectLinks(texto)` → boolean  
**Uso**: Usada por antilink.js para validar mensajes

**Patrón de detección**:
```regex
http(s)?://
(www\.)?
[dominio]
```

---

#### **botones.js**
**Propósito**: Sistema de botones interactivos  
**Tipos**:
- Botones URL
- Botones de llamada
- Botones copy
- Botones reply

**Ejemplo**:
```javascript
const buttons = [
  { buttonId: '1', buttonText: { displayText: 'Opción 1' }, type: 1 },
  { buttonId: '2', buttonText: { displayText: 'Opción 2' }, type: 1 }
]
```

---

## 🔐 Sistema de Permisos

Propiedades del handler:

```javascript
handler.help         // Array: Nombres del comando
handler.tags         // Array: Categoría/tags
handler.command      // Array: Comando(s) y alias(es)

// Restricciones (boolean)
handler.owner        // Solo propietario del bot
handler.group        // Solo en grupos
handler.private      // Solo en privado
handler.admin        // Solo admins del grupo
handler.botAdmin     // Bot debe ser admin
handler.disable      // Comando deshabilitado
```

**Validación automática**:
```javascript
if (handler.owner && !m.isOwner) {
    // Rechazar comando
}
if (handler.group && !m.isGroup) {
    // Rechazar comando
}
```

---

## 📦 Objeto Message (m)

```javascript
m.chat              // ID del chat
m.sender            // ID del remitente
m.isOwner           // ¿Es owner?
m.isAdmin           // ¿Es admin del grupo?
m.isGroup           // ¿Es grupo?
m.isMedia           // ¿Tiene media?
m.type              // Tipo: 'text', 'image', etc.
m.body              // Texto del mensaje
m.reply(text)       // Responder
m.key               // Info del mensaje para editar
```

## 🔗 Objeto Connection (conn)

```javascript
conn.sendMessage(chat, content, options)   // Enviar mensaje
conn.reply(chat, text, quoted)             // Responder a mensaje
conn.groupMetadata(jid)                    // Info del grupo
conn.profilePictureUrl(jid)                // Avatar
conn.user.id                               // ID del bot
```

---

## 📊 Parámetros Destructurados

Disponibles en handler:

```javascript
let handler = async (m, {
    conn,              // Conexión WASocket
    args,              // Argumentos sin el comando
    usedPrefix,        // Prefijo usado (. / # / !)
    command,           // Comando ejecutado
    text,              // Texto después del comando
    filename           // Archivo del comando
}) => {
    // ...
}
```

---

## 🚀 Cargar Comandos Dinámicamente

El sistema carga automáticamente todos los archivos `.js` en `src/commands/`:

```javascript
// lib/loader.js

export function loadCommands(dir) {
    const archivos = []
    // Recorre recursivamente carpetas
    // Carga archivos .js que no comienzan con _
    // Extrae metadatos (help, tags, command, aliases)
    return archivos
}
```

**Naming conventions**:
- Archivos publicos: `comando.js`
- Archivos internos: `_utilidad.js` (se ignoran)
- Carpetas: por categoría

---

## 📝 Ejemplo - Crear Nuevo Comando

### Template básico:

```javascript
// src/commands/general/saludar.js

let handler = async (m, { conn, args }) => {
    const nombre = args.join(' ') || 'Amigo'
    
    await conn.sendMessage(m.chat, {
        text: `¡Hola ${nombre}! 👋`
    }, { quoted: m })
}

handler.help = ['saludar']
handler.tags = ['general']
handler.command = ['saludar', 'hola', 'hi']

export default handler
```

### Uso:
```
.saludar Fernando
.hola Juan
.hi María
```

---

## 🔄 Ciclo de Vida

1. **Carga** - Importa archivo del comando
2. **Registro** - Mapea command → handler en cache
3. **Ejecución** - Usuario usa comando
4. **Validación** - Verifica permisos
5. **Procesamiento** - Ejecuta handler
6. **Respuesta** - Envía resultado

---

## 💡 Best Practices

✅ **Siempre quoted**: `{ quoted: m }` para contexto  
✅ **Try-catch**: Maneja errores del bot  
✅ **Validar args**: Verifica argumentos requeridos  
✅ **Permisos**: Usa `handler.owner`, `handler.group`  
✅ **Nombres claros**: Comando = archivo  
✅ **Documentación**: Help descriptivo  
✅ **Performance**: Evita loops infinitos  

---

## 🚨 Errores Comunes

### ❌ Handler no se ejecuta
- [ ] ¿Está el archivo en carpeta correcta?
- [ ] ¿Tiene extensión .js?
- [ ] ¿Está exportado con `export default handler`?
- [ ] ¿handler.command está definido?

### ❌ Comando no reconocido
- [ ] ¿El nombre está en `handler.command`?
- [ ] ¿Coincide con el prefijo global?
- [ ] ¿El servidor fue reiniciado tras agregar comando?

### ❌ Permisos fallando
- [ ] ¿`m.isOwner` funciona?
- [ ] ¿El número está en `global.owner`?
- [ ] ¿Es array de arrays: `[['5214183357841', 'Fernando', true]]`?

---

## 📚 Recursos

- [Baileys Docs](https://github.com/WhiskeySockets/Baileys)
- [Node.js API](https://nodejs.org/api/)
- [Canvas Library](https://github.com/Brooooooklyn/canvas)
- [Asta Bot Docs](https://github.com/Fer2809fl/asta-)

---

**Última actualización**: 25 de abril de 2026  
**Versión**: 2.0.0  
**Mantener por**: Fernando (Asta Bot Development Team)
