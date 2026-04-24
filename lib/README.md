# 📚 Documentación Técnica — Asta Bot v2.0.0

<p align="center">
  <img src="https://raw.githubusercontent.com/Fer2809fl/Asta_bot/refs/heads/main/lib/astavs.jpg" width="120" style="border-radius: 50%;" />
</p>

<h1 align="center">🤖 Asta Bot — Multi-Device WhatsApp</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-≥18.0.0-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Baileys-Personalizado-25D366?logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue" />
  <img src="https://img.shields.io/badge/Status-Production-brightgreen" />
</p>

---

## 📖 Tabla de Contenidos

- [🏗️ Arquitectura General](#️-arquitectura-general)
- [📁 Estructura de Carpetas](#-estructura-de-carpetas)
- [🔧 Librerías del Core (`lib/`)](#-librerías-del-core-lib)
  - [`connection.js`](#-connectionjs)
  - [`loader.js`](#-loaderjs)
  - [`message-handler.js`](#-message-handlerjs)
  - [`print.js`](#-printjs)
  - [`store.js`](#-storejs)
  - [`serbot.js`](#-serbotjs)
  - [`web.js`](#-webjs)
- [⚡ Librerías de Funciones (`src/commands/funciones/`)](#-librerías-de-funciones-srccommandsfunciones)
  - [`botones.js`](#-botonesjs)
- [🎮 Sistema de Comandos](#-sistema-de-comandos)
- [🌐 Panel Web](#-panel-web)
- [🔐 Sistema de Sub-Bots](#-sistema-de-sub-bots)
- [⚙️ Configuración](#️-configuración)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [📝 Convenciones de Código](#-convenciones-de-código)

---

## 🏗️ Arquitectura General

```
┌───────────────────────────────────────────────────────┐
│                    📱 USUARIO WHATSAPP                │
└──────────────────────────┬────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────┐
│              🔌 @whiskeysockets/baileys               │
│         (Conexión WebSocket con WhatsApp Web)         │
└──────────────────────────┬────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────┐
     │ connection.js│ │ store.js │ │  serbot.js   │
     │  (WASocket)  │ │ (Caché)  │ │ (Sub-Bots)   │
     └──────┬───────┘ └────┬─────┘ └──────┬───────┘
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                  ┌─────────────────┐
                  │   loader.js     │
                  │ (Carga plugins) │
                  └────────┬────────┘
                           ▼
                 ┌────────────────────┐
                 │ message-handler.js │
                 │ (Router + Auth)    │
                 └────────┬───────────┘
                          ▼
                  ┌──────────────────┐
                  │  src/commands/   │
                  │  (Plugins)       │
                  └──────────────────┘
```

---

## 📁 Estructura de Carpetas

```
📦 PROYECTO-BOT/
│
├── 📄 index.js                          # 🚀 Punto de entrada principal
├── 📄 package.json                      # 📦 Dependencias y scripts
├── 📄 .env (opcional)                   # 🔐 Variables de entorno
│
├── 📁 lib/                              # 🧠 NÚCLEO DEL BOT
│   ├── 📄 connection.js                 # 🔌 Conexión WASocket + LID
│   ├── 📄 loader.js                     # 📂 Carga dinámica de comandos
│   ├── 📄 message-handler.js            # 🎯 Router de mensajes + permisos
│   ├── 📄 print.js                      # 🖨️ Logs de consola estilizados
│   ├── 📄 store.js                      # 💾 Store persistente de Baileys
│   ├── 📄 serbot.js                     # 🤖 Gestor de Sub-Bots 24/7
│   └── 📄 web.js                        # 🌐 Servidor Express + Socket.IO
│
├── 📁 src/
│   ├── 📁 commands/                     # 🎮 COMANDOS DEL BOT
│   │   ├── 📁 funciones/                # 🧰 Librerías reutilizables
│   │   │   ├── 📄 botones.js            # 🔘 Sistema de botones interactivos
│   │   │   └── 📄 README.md             # 📖 Esta documentación
│   │   │
│   │   ├── 📁 general/                  # 📋 Comandos generales
│   │   │   ├── 📄 menu.js               # 📋 Menú principal con botones
│   │   │   ├── 📄 ping.js               # 🏓 Latencia del bot
│   │   │   └── 📄 testlid.js            # 🆔 Test de resolución LID
│   │   │
│   │   ├── 📁 owner/                    # 👑 Comandos exclusivos owner
│   │   │   └── 📄 update.js             # 🔄 Actualización del bot
│   │   │
│   │   ├── 📁 group/                    # 👥 Comandos de grupo
│   │   │   ├── 📄 welcome.js            # 👋 Sistema de bienvenida
│   │   │   └── 📄 group-events.js       # 📢 Eventos de grupo
│   │   │
│   │   ├── 📁 serbot/                   # 🔗 Comandos de sub-bots
│   │   │   ├── 📄 qr.js                 # 📱 Generar QR
│   │   │   ├── 📄 code.js               # 🔢 Código de vinculación
│   │   │   ├── 📄 delsub.js             # 🗑️ Eliminar sub-bot
│   │   │   └── 📄 bots.js               # 📊 Lista de sub-bots
│   │   │
│   │   ├── 📄 gacha.js                  # 🎰 Menú Gacha
│   │   ├── 📄 grupo.js                  # 👥 Menú Grupo
│   │   ├── 📄 rpg.js                    # ⚔️ Menú RPG
│   │   ├── 📄 games.js                  # 🎮 Menú Games
│   │   └── 📄 antilink.js               # 🛡️ Menú Antilinks
│   │
│   ├── 📁 database/                     # 🗄️ Configuración global
│   │   └── 📄 config.js                 # ⚙️ Variables globales
│   │
│   └── 📁 public/                         # 🎨 Frontend del panel web
│       ├── 📄 index.html                  # 🏠 Página principal
│       ├── 📄 login.html                  # 🔐 Login
│       ├── 📄 dashboard.html              # 📊 Dashboard
│       ├── 📄 admin.html                  # 🛠️ Panel admin
│       └── 📁 uploads/                    # 📤 Imágenes subidas
│
├── 📁 session/                            # 🔐 SESIONES
│   ├── 📁 Principal/                      # 🏠 Sesión bot principal
│   │   └── 📄 creds.json                  # 📄 Credenciales cifradas
│   └── 📁 Sub-bots/                       # 🤖 Sesiones sub-bots
│       └── 📁 [número]/                   # 📱 Por número de teléfono
│           ├── 📄 creds.json
│           └── 📄 config.json             # ⚙️ Config personalizada
│
└── 📁 data/                               # 📊 DATOS PERSISTENTES
    ├── 📄 store.json                      # 💾 Store de chats/contactos
    ├── 📄 errores-runtime.json            # 🐛 Log de errores
    └── 📄 welcome-configs.json            # 👋 Configs de bienvenida
```

---

## 🔧 Librerías del Core (`lib/`)

### 🔌 `connection.js`

> **Responsabilidad:** Establecer y mantener la conexión WebSocket con WhatsApp Web.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Crear el `WASocket`, manejar autenticación y reconexiones automáticas |
| **Tecnología** | `@whiskeysockets/baileys` + `lidsync` |
| **Características** | 🔑 Pairing code, 🔄 auto-reconnect, 🆔 LID resolution, 🤐 silent logger |

**Flujo de conexión:**
```
1. useMultiFileAuthState() → Cargar credenciales
2. makeWASocket() → Crear socket
3. pluginLid(sock, { store }) → Inyectar LID sync
4. bindStoreToSocket(sock) → Vincular store
5. requestPairingCode() → Vincular por código
6. connection.update → Manejar estados
```

**Manejo de errores críticos:**

| Código | Acción |
|--------|--------|
| `401` | ❌ Credenciales inválidas → Exit |
| `403` | 🚫 Baneado → Exit |
| `405` | 🚫 Logged out → Exit |
| `428` | ⏳ Reconectar en 10s |
| `515` | 🔄 Reconectar en 5s |
| Otros | 🔄 Reconectar inmediatamente |

**Exportaciones:**
```javascript
export async function start()     // Iniciar conexión
export function getSocket()         // Obtener socket activo
```

---

### 📂 `loader.js`

> **Responsabilidad:** Cargar dinámicamente todos los comandos del bot al iniciar.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Escaneo recursivo de `src/commands/` y registro en Map |
| **Tecnología** | `fs`, `path`, `pathToFileURL` (ESM) |
| **Características** | 🔄 Hot-reload friendly, 🏷️ Soporte aliases, 🛡️ Deduplicación de mensajes |

**Proceso de carga:**
```
src/commands/
  ├─ general/menu.js  → command: ['menu', 'menú', 'allmenu']
  ├─ owner/update.js  → command: ['update']
  └─ group/welcome.js → command: ['welcome', 'welcomeon', 'welcomeoff']

Resultado: Map(5) {
  'menu'      → { plugin, filePath }
  'menú'      → { plugin, filePath }
  'allmenu'   → { plugin, filePath }
  'update'    → { plugin, filePath }
  'welcome'   → { plugin, filePath }
  ...
}
```

**Deduplicación de mensajes:**
```javascript
const processedMessages = new NodeCache({ stdTTL: 30, checkperiod: 60 })
// Clave: `${botId}:${messageId}`
// TTL: 30 segundos (evita procesar el mismo mensaje 2 veces)
```

**Exportaciones:**
```javascript
export function loadCommands(dir)     // Escaneo recursivo
export async function bindEvents(sock) // Vincular eventos al socket
```

---

### 🎯 `message-handler.js`

> **Responsabilidad:** Router central. Recibe todos los mensajes, valida permisos y ejecuta comandos.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Pipeline de procesamiento de mensajes |
| **Tecnología** | `NodeCache`, `chalk`, `path` |
| **Características** | 🛡️ Anti-spam, 👑 Owner check, 👥 Admin check, 🆔 LID resolve, 🔘 Button handler |

**Pipeline de procesamiento:**

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣  messages.upsert                                        │
│     └── Ignorar si: status@broadcast, protocolMessage       │
├─────────────────────────────────────────────────────────────┤
│  2️⃣  Deduplicación                                          │
│     └── NodeCache: `${botId}:${messageId}`                  │
├─────────────────────────────────────────────────────────────┤
│  3️⃣  Resolución LID                                         │
│     └── sock.lid.resolve(senderJid) → @s.whatsapp.net       │
├─────────────────────────────────────────────────────────────┤
│  4️⃣  Extracción de texto                                    │
│     └── conversation | extendedTextMessage | caption        │
├─────────────────────────────────────────────────────────────┤
│  5️⃣  Validación de prefix                                   │
│     └── text.startsWith(global.prefix || '.')               │
├─────────────────────────────────────────────────────────────┤
│  6️⃣  Parseo de comando                                      │
│     └── args = text.slice(prefix).split(/\s+/)              │
├─────────────────────────────────────────────────────────────┤
│  7️⃣  Verificación de permisos                               │
│     └── owner → group → private → admin → botAdmin          │
├─────────────────────────────────────────────────────────────┤
│  8️⃣  Ejecución del plugin                                   │
│     └── plugin(m, { conn, args, isOwner, isAdmin, ... })    │
├─────────────────────────────────────────────────────────────┤
│  9️⃣  Manejo de errores                                      │
│     └── registrarError() + mensaje al usuario               │
└─────────────────────────────────────────────────────────────┘
```

**Sistema de permisos (`dfail`):**

| Tipo | Mensaje | Requisito |
|------|---------|-----------|
| `owner` | 👑 Solo para owners | `global.owner` array |
| `group` | 👥 Solo en grupos | `jid.endsWith('@g.us')` |
| `private` | 👤 Solo en privado | `!isGroup` |
| `admin` | 🛡️ Necesitas ser admin | `participant.admin` |
| `botAdmin` | 🤖 Bot necesita admin | `botP.admin` |
| `invalid` | ❌ Comando no existe | `!commands.has(command)` |

**Exportaciones:**
```javascript
export async function handleMessage(sock, m, commands)
```

---

### 🖨️ `print.js`

> **Responsabilidad:** Logs estilizados de mensajes entrantes en consola.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Debugging visual de mensajes |
| **Tecnología** | `chalk` (colores en terminal) |
| **Características** | 🎨 Iconos por tipo, 📊 Info de grupo, ⏰ Timestamp |

**Tipos de mensaje soportados:**

| Tipo | Icono | Color |
|------|-------|-------|
| `conversation` | 💬 | Blanco |
| `imageMessage` | 🖼️ | Magenta |
| `videoMessage` | 🎥 | Magenta |
| `audioMessage` | 🎵 | Magenta |
| `stickerMessage` | 🎭 | Magenta |
| `documentMessage` | 📄 | Magenta |
| `reactionMessage` | ❤️ | Rojo |
| `locationMessage` | 📍 | Verde |
| `contactMessage` | 👤 | Verde |
| `pollCreationMessage` | 📊 | Amarillo |
| `buttonsResponseMessage` | 🔘 | Cyan |
| `listResponseMessage` | 📋 | Cyan |

**Ejemplo de salida:**
```
──────────────────────────────────────────────────
👥 Grupo: Mi Grupo Favorito
👤 De: 5214183357841
💬 Tipo: conversation
📝 Mensaje: .menu
🕐 14:32:15
──────────────────────────────────────────────────
```

**Exportaciones:**
```javascript
export function printMensaje(msg, conn)
```

---

### 💾 `store.js`

> **Responsabilidad:** Persistencia de chats, contactos y mensajes en memoria + disco.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Cache en memoria con guardado periódico |
| **Tecnología** | `@whiskeysockets/baileys` `makeInMemoryStore` |
| **Características** | 💾 Auto-save cada 10s, 📂 Archivo `data/store.json`, 🔍 Búsqueda de mensajes |

**Ciclo de vida:**
```
1. createStore() → Crea store en memoria
2. store.readFromFile() → Carga datos previos
3. bindStoreToSocket(sock) → Escucha eventos
4. setInterval(10s) → store.writeToFile()
5. destroyStore() → Guarda y limpia
```

**Exportaciones:**
```javascript
export function createStore()              // Crear store
export function getStore()                 // Obtener store activo
export function bindStoreToSocket(sock)    // Vincular a socket
export async function getMessageFromStore(key)  // Buscar mensaje
export function destroyStore()             // Destruir y guardar
```

---

### 🤖 `serbot.js`

> **Responsabilidad:** Sistema completo de sub-bots (bots secundarios) conectados 24/7.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Crear, gestionar y mantener sub-bots independientes |
| **Tecnología** | `baileys`, `qrcode`, `NodeCache`, `pino` |
| **Características** | 🌐 Web dashboard, 📱 QR/Code pairing, 🔄 Auto-reconnect, 💾 Config persistente |

**Arquitectura de sub-bots:**
```
┌─────────────────────────────────────────────────────────────┐
│                    🏠 BOT PRINCIPAL                         │
│                  (Asta Bot Principal)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
       ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
       │ Sub-Bot │  │ Sub-Bot │  │ Sub-Bot │  │ Sub-Bot │
       │  +5211  │  │  +5212  │  │  +5213  │  │  +5214  │
       │  (Web)  │  │  (Web)  │  │  (Web)  │  │  (Web)  │
       └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
            └────────────┴────────────┴────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Web Dashboard     │
              │  (Express + Socket) │
              └─────────────────────┘
```

**Clase `WebConnectionController`:**

| Método | Descripción |
|--------|-------------|
| `start()` | Iniciar conexión del sub-bot |
| `handlePairingCode()` | Generar código de 8 dígitos |
| `handleQR()` | Generar QR como imagen |
| `handleOpen()` | Registrar sub-bot conectado |
| `handleClose()` | Manejar desconexión y reintentar |
| `setupMessageHandler()` | Cargar comandos para el sub-bot |
| `cleanup()` | Limpiar recursos y sesión |

**Configuración de sub-bot (`config.json`):**
```json
{
  "name": "Mi Sub-Bot",
  "mode": "public",
  "antiPrivate": false,
  "antiSpam": true,
  "cooldown": 3000,
  "logoUrl": "https://...",
  "logos": {
    "menu": "/uploads/logo_menu.png",
    "gacha": "/uploads/logo_gacha.png"
  },
  "owner": "5214183357841",
  "source": "web"
}
```

**Exportaciones principales:**
```javascript
export async function startWebConnection(phone, type, callbacks)  // Crear conexión web
export function getWebConnectionStatus(phone)                        // Estado de conexión
export function cancelWebConnection(phone)                         // Cancelar
export async function generateQRBuffer(phone)                      // QR como buffer
export function getPairingCode(phone)                            // Obtener código
export function linkWebSubBotToUser(phone, username)              // Vincular a usuario
export async function autoStartSubBots()                         // Auto-iniciar guardados
export function getSubConfig(userId)                             // Leer config
export function saveSubConfig(userId, data)                      // Guardar config
export async function cleanSubBotCache(userId)                  // Limpiar cache
export function isSubBotConnected(jid)                            // Verificar estado
export function cleanNum(jid)                                    // Limpiar número
```

---

### 🌐 `web.js`

> **Responsabilidad:** Servidor web completo con API REST, autenticación y WebSocket.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Panel de control web para gestionar sub-bots |
| **Tecnología** | `express`, `socket.io`, `crypto` |
| **Características** | 🔐 JWT-like tokens, 👥 Roles (owner/user), 📊 Dashboard, 🛠️ Admin panel |

**Endpoints API:**

#### 🔓 Públicos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/info` | Info del bot y estadísticas |
| `POST` | `/api/auth/register` | Registro con token |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/request-bot` | Solicitar sub-bot (QR/Code) |

#### 🔒 Requieren autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/auth/me` | Perfil del usuario |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/profile` | Ver perfil |
| `POST` | `/api/profile/update` | Actualizar perfil |
| `GET` | `/api/dashboard` | Dashboard del sub-bot |
| `POST` | `/api/dashboard/config` | Configurar sub-bot |
| `POST` | `/api/dashboard/logo` | Subir logo |
| `POST` | `/api/dashboard/leave-group` | Salir de grupo |
| `GET` | `/api/dashboard/group/:jid` | Info de grupo |
| `GET` | `/api/dashboard/welcome/:groupJid` | Config bienvenida |
| `POST` | `/api/dashboard/welcome/:groupJid` | Guardar config bienvenida |

#### 🛡️ Solo Owner
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Estadísticas globales |
| `GET` | `/api/admin/bots` | Lista todos los bots |
| `POST` | `/api/admin/bot/:jid/restart` | Reiniciar bot |
| `POST` | `/api/admin/bot/:jid/reinstall` | Reinstalar módulos |
| `DELETE` | `/api/admin/bot/:jid` | Eliminar bot |
| `GET` | `/api/admin/users` | Lista usuarios |
| `POST` | `/api/admin/users` | Crear usuario |
| `DELETE` | `/api/admin/users/:username` | Eliminar usuario |
| `POST` | `/api/admin/users/:username/money` | Gestionar dinero |
| `POST` | `/api/admin/exec` | Ejecutar comando en bots |

**Sistema de autenticación:**
```
1. Owner crea token: POST /api/tokens/create (secret required)
2. Usuario se registra: POST /api/auth/register (token + credentials)
3. Login: POST /api/auth/login → recibe session token
4. Token en header: Authorization: Bearer <token>
5. requireAuth middleware valida token
6. requireRole('owner') verifica rol
```

**Exportaciones:**
```javascript
export { app, io }  // Express app + Socket.IO server
```

---

## ⚡ Librerías de Funciones (`src/commands/funciones/`)

### 🔘 `botones.js`

> **Responsabilidad:** Abstracción completa del sistema de botones interactivos de WhatsApp.

| Aspecto | Descripción |
|---------|-------------|
| **Propósito** | Enviar botones sin manejar `proto.Message` manualmente |
| **Dependencia** | `@whiskeysockets/baileys` (versión personalizada) |
| **Características** | 🛡️ Fallback automático, ✅ Validación de inputs, 🎨 Soporte logos |

**Funciones disponibles:**

#### 📋 `botonCopiar(conn, chatId, text, copyText, buttonText, options)`
Envía un botón que copia texto al portapapeles del usuario.

```javascript
import { botonCopiar } from '../funciones/botones.js'

await botonCopiar(
    conn,                           // Conexión WASocket
    m.chat,                         // JID del chat
    '📋 *INSTALACIÓN*\n\nEjecuta:', // Texto del mensaje
    'npm install && npm start',     // Texto a copiar
    '📋 Copiar Comando',            // Texto del botón
    { quoted: m }                   // Opciones adicionales
)
// Resultado: Botón verde "📋 Copiar Comando"
```

**Fallback:** Si falla, envía el texto en formato código Markdown.

---

#### 🔗 `botonUrl(conn, chatId, text, url, buttonText, options)`
Envía un botón que abre una URL externa.

```javascript
import { botonUrl } from '../funciones/botones.js'

await botonUrl(
    conn,
    m.chat,
    '🌐 *NUESTRO REPO*',
    'https://github.com/Fer2809fl/Asta_bot',
    '🌐 Ver GitHub',
    { quoted: m }
)
// Resultado: Botón que abre GitHub
```

**Fallback:** Envía el link como texto con preview.

---

#### ⚡ `botonesRapidos(conn, chatId, text, buttons, options)`
Envía múltiples botones de respuesta rápida.

```javascript
import { botonesRapidos } from '../funciones/botones.js'

await botonesRapidos(
    conn,
    m.chat,
    '🎮 *MENÚ RÁPIDO*\n\nSelecciona:',
    [
        { id: '.menu',   text: '📋 Menú Principal' },
        { id: '.gacha',  text: '🎰 Gacha' },
        { id: '.grupo',  text: '👥 Grupo' },
        { id: '.owner',  text: '👑 Owner' }
    ],
    { quoted: m }
)
// Resultado: 4 botones horizontales
```

**Validación:** Filtra botones sin `id` o `text`. Mínimo 1 botón requerido.

**Fallback:** Lista numerada como texto.

---

#### 📞 `botonLlamada(conn, chatId, text, phoneNumber, buttonText, options)`
Envía un botón para iniciar una llamada de WhatsApp.

```javascript
import { botonLlamada } from '../funciones/botones.js'

await botonLlamada(
    conn,
    m.chat,
    '📞 *SOPORTE*\n\n¿Necesitas ayuda?',
    '5214183357841',      // Número con código de país
    '📞 Llamar Ahora',
    { quoted: m }
)
// Resultado: Botón que abre llamada en WhatsApp
```

**Validación:** Limpia el número (`replace(/\D/g, '')`) y verifica longitud mínima.

**Fallback:** Link `wa.me/` como texto.

---

#### 📂 `menuLista(conn, chatId, title, description, sections, options)`
Envía un menú desplegable con secciones y filas.

```javascript
import { menuLista } from '../funciones/botones.js'

await menuLista(
    conn,
    m.chat,
    '📋 *MENÚ PRINCIPAL*',           // Título
    'Selecciona una opción:',         // Descripción
    [                                 // Secciones
        {
            title: '🎮 COMANDOS',
            rows: [
                { id: '.gacha', title: '🎰 Menú Gacha', description: 'Sistema de gacha' },
                { id: '.grupo', title: '👥 Menú Grupo', description: 'Admin de grupos' },
                { id: '.rpg',   title: '⚔️ Menú RPG',   description: 'Rol y aventuras' },
                { id: '.games', title: '🎮 Menú Games', description: 'Juegos y diversión' }
            ]
        },
        {
            title: '⚙️ CONFIGURACIÓN',
            rows: [
                { id: '.config', title: '⚙️ Configurar', description: 'Personalizar bot' },
                { id: '.restartbot', title: '🔄 Reiniciar', description: 'Reiniciar sub-bot' }
            ]
        }
    ],
    { quoted: m }
)
// Resultado: Lista desplegable con 2 secciones
```

**Validación:** Filtra secciones vacías, filas sin `id` o `title`.

**Fallback:** Texto formateado con emojis.

---

#### 🎯 `mensajeInteractivo(conn, chatId, text, buttons, options)`
Combina múltiples tipos de botones en un solo mensaje.

```javascript
import { mensajeInteractivo } from '../funciones/botones.js'

await mensajeInteractivo(
    conn,
    m.chat,
    '🎯 *PANEL DE CONTROL*',
    [
        { type: 'url',   text: '🌐 GitHub',       value: 'https://github.com/Fer2809fl/Asta_bot' },
        { type: 'copy',  text: '📋 Comando',       value: 'npm start' },
        { type: 'quick', text: '⚡ Menú',          value: '.menu' },
        { type: 'url',   text: '📢 Canal',         value: 'https://whatsapp.com/channel/...' }
    ],
    { quoted: m }
)
// Resultado: Mensaje con 4 botones de diferentes tipos
```

**Tipos soportados:**

| Tipo | Acción | Emoji default |
|------|--------|---------------|
| `url` | Abre URL externa | 🔗 |
| `copy` | Copia texto al portapapeles | 📋 |
| `quick` | Envía respuesta rápida | ⚡ |
| `call` | Inicia llamada | 📞 |

**Validación:** Requiere `type`, `text` y `value`. Tipos inválidos son rechazados.

---

#### 🏠 `menuPrincipal(conn, chatId, botName, options)`
Menú predefinido de Asta Bot con todas las opciones principales.

```javascript
import { menuPrincipal } from '../funciones/botones.js'

await menuPrincipal(
    conn,
    m.chat,
    'Asta Bot',           // Nombre del bot
    { quoted: m }
)
// Resultado: Menú completo con Gacha, Grupo, RPG, Games, Antilinks + links
```

**Botones incluidos:**
- 🎰 Menú Gacha → `.gacha`
- 👥 Menú Grupo → `.grupo`
- 🛡️ Menú Antilinks → `.antilinks`
- ⚔️ Menú RPG → `.rpg`
- 🎮 Menú Games → `.games`
- 📢 Canal → Link externo

---

#### 🔍 `checkBotonesSupport()`
Verifica qué funciones de botones están disponibles en la versión de Baileys.

```javascript
import { checkBotonesSupport } from '../funciones/botones.js'

const soporte = checkBotonesSupport()
console.log(soporte)
// {
//   sendCopyButton: true,
//   sendUrlButton: true,
//   sendQuickReplyButtons: true,
//   sendCallButton: true,
//   sendListMenu: true,
//   sendInteractiveMessage: true
// }
```

**Uso:** Debugging y validación antes de enviar botones.

---

## 🎮 Sistema de Comandos

### Estructura de un plugin

```javascript
// src/commands/general/ejemplo.js

let handler = async (m, { conn, args, usedPrefix, command, isOwner, isAdmin, isGroup }) => {
    // Lógica del comando
    await conn.sendMessage(m.chat, { text: '¡Hola!' }, { quoted: m })
}

// Metadatos del comando
handler.help = ['ejemplo']           // Ayuda para .help
handler.tags = ['general']           // Categoría
handler.command = ['ejemplo', 'ej']  // Nombres del comando
handler.aliases = ['ej']             // Alias adicionales

// Permisos (opcional)
handler.owner = false    // Solo owners
handler.group = false    // Solo grupos
handler.private = false  // Solo privado
handler.admin = false    // Solo admins
handler.botAdmin = false // Bot necesita admin

export default handler
```

### Contexto recibido (`{ conn, args, ... }`)

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `conn` | `WASocket` | Conexión activa de Baileys |
| `args` | `string[]` | Argumentos del comando |
| `usedPrefix` | `string` | Prefijo usado (ej: `.`) |
| `command` | `string` | Nombre del comando ejecutado |
| `isOwner` | `boolean` | ¿Es owner? |
| `isGroup` | `boolean` | ¿Es grupo? |
| `isAdmin` | `boolean` | ¿Es admin del grupo? |
| `isBotAdmin` | `boolean` | ¿El bot es admin? |
| `groupMetadata` | `object` | Metadata del grupo |
| `participants` | `array` | Participantes del grupo |
| `fromMe` | `boolean` | ¿Mensaje del bot? |
| `text` | `string` | Texto después del comando |

---

## 🌐 Panel Web

### Rutas del frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Página principal (info del bot) |
| `/login` | Inicio de sesión |
| `/dashboard` | Panel de control del sub-bot |
| `/admin` | Panel de administración |

### Eventos Socket.IO

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `connection` | Server → Client | Info inicial del bot |
| `subscribe-logs` | Client → Server | Suscribirse a logs (owner only) |
| `logs-subscribed` | Server → Client | Confirmación de suscripción |
| `log` | Server → Client | Log en tiempo real |
| `disconnect` | Bidireccional | Cliente desconectado |

---

## 🔐 Sistema de Sub-Bots

### Flujo de creación

```
1. Usuario visita /dashboard
2. Clic en "Crear Sub-Bot"
3. Ingresa número de teléfono
4. Selecciona método: QR o Código
5. Backend llama startWebConnection()
6. Se genera QR o código de 8 dígitos
7. Usuario vincula en WhatsApp
8. handleOpen() registra el sub-bot
9. Sub-bot activo 24/7 🎉
```

### Estados de conexión

| Estado | Descripción |
|--------|-------------|
| `pending` | Esperando QR/código |
| `qr` | QR generado, esperando escaneo |
| `code` | Código generado, esperando vinculación |
| `connected` | ✅ Conectado y funcionando |
| `disconnected` | ❌ Desconectado |
| `timeout` | ⏳ Tiempo agotado |
| `error` | 💥 Error en conexión |

---

## ⚙️ Configuración

### Variables globales (`src/database/config.js`)

```javascript
global.prefix = '.'              // Prefijo de comandos
global.owner = [['521...', 'Fernando']]  // Owners
global.botname = 'Asta Bot'     // Nombre del bot
global.namebot = 'Asta Bot'
global.channel = 'https://whatsapp.com/channel/...'
global.redes = 'https://study-bots.xo.je'
global.comunidad = 'https://chat.whatsapp.com/...'
global.icono = 'https://.../astavs.jpg'
global.logo = 'https://.../logo.png'
global.version = '2.0.0'
```

### Variables de entorno (`.env`)

```env
PORT=24683
WEB_SECRET=asta-web-2024
NODE_ENV=production
```

---

## 🚀 Inicio Rápido

```bash
# 1. Clonar repositorio
git clone https://github.com/Fer2809fl/Asta_bot.git
cd Asta_bot

# 2. Instalar dependencias
npm install

# 3. Configurar variables
nano src/database/config.js

# 4. Iniciar bot
npm start

# 5. Vincular con código de pareja
# Introduce tu número cuando se solicite

# 6. Panel web
# Abre http://localhost:24683 en tu navegador
```

---

## 📝 Convenciones de Código

### Nomenclatura

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Funciones | camelCase | `handleMessage`, `getAdminInfo` |
| Constantes | UPPER_SNAKE | `WEB_QR_EXPIRY`, `SILENT_PATTERNS` |
| Clases | PascalCase | `WebConnectionController` |
| Archivos | kebab-case | `message-handler.js`, `group-events.js` |
| Plugins | handler export default | `export default handler` |

### Estructura de imports

```javascript
// 1. Módulos nativos de Node.js
import fs from 'fs'
import path from 'path'

// 2. Dependencias de npm
import chalk from 'chalk'
import NodeCache from 'node-cache'

// 3. Imports locales (con extensión .js para ESM)
import { createStore } from './store.js'
import { botonesRapidos } from '../funciones/botones.js'
```

### Manejo de errores

```javascript
try {
    // Operación que puede fallar
    await conn.groupMetadata(jid)
} catch (error) {
    // Log silencioso o notificación
    console.error('[nombre-funcion] Error:', error.message)
    // Fallback opcional
    return { success: false, error: error.message }
}
```

---

<p align="center">
  <b>🤖 Asta Bot v2.0.0</b><br>
  <i>Powered by Fernando 👑 — Todos los derechos reservados</i><br><br>
  <a href="https://whatsapp.com/channel/0029VbAoYE99hXF1wm3zmQ21">📢 Canal</a> •
  <a href="https://github.com/Fer2809fl/Asta_bot">🌐 GitHub</a> •
  <a href="https://study-bots.xo.je">🌐 Web</a>
</p>

---

*Documentación generada por Orion Wolf — Última actualización: 2026-04-23*