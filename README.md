<p align="center">
	<img src="https://raw.githubusercontent.com/Fer2809fl/asta-/refs/heads/main/src/assets/019db6a7-392a-70ec-856a-6ee123a4155d.png" alt="Asta Bot Logo" width="160" />
</p>

# Asta Bot  v2.0.0  🤖

**Bot de WhatsApp Multi-dispositivo** enfocado en administración de grupos, utilidades, economía y extensiones tipo mini-juego (Pokémon). Construido sobre una base modular con carga dinámica de comandos.

**Estado:** estable / experimental (v2.0.0)

**Descripción corta:** Asta es un bot para WhatsApp diseñado para gestionar grupos, ofrecer comandos de utilidad, mini-economía y funcionalidades avanzadas (anti-spam, anti-links, welcome, comandos de owner, integraciones y más).

**Características principales**

- **🧩 Modular:** comandos organizados en `src/commands/` por categoría.
- **🚫 Anti-abuso:** múltiples módulos `anti-*` para controlar audio, links, spam, vistas únicas, etc.
- **🛡️ Gestión de grupos:** promote/demote, kick, welcome, tagall, setsubject, setppfc.
- **💸 Economía y minijuegos:** sistema de balance, depósito/retirar, diario, mini-juegos y un módulo Pokémon con batalla e inventario.
- **🔗 Integraciones:** QR, servidores websockets, dashboard básico en `public/`.
- **⚡ Rendimiento:** usa `@napi-rs/canvas`, `baileys` (fork local) y cache en memoria.

**Repositorio:** `Fer2809fl/asta-`

---

**Índice rápido**

- **Instalación**
- **Uso**
- **Estructura del proyecto**
- **Comandos / Categorías**
- **Animación: Máquina de escribir**
- **Colaboradores**
- **Licencia**

---

**Instalación**

Requisitos: `node >= 18`

```bash
# instalar dependencias
npm install

# iniciar el bot
npm start
```

**Modo desarrollo**

```bash
npm run dev
```

---

**Estructura principal (resumen)**

- **`index.js`**: punto de entrada.
- **`lib/`**: lógica central (conexión, loader, manejo de mensajes, store).
- **`src/commands/`**: comandos por categoría (general, group, owner, economy, pokemon, menus, funciones, etc.).
- **`src/database/`**: configuraciones y DB (p.ej. `pokemonDB.js`).
- **`public/`**: paneles y frontend estático (dashboard, admin pages).

Para ver todos los comandos, revisa la carpeta `src/commands/`.

---

**Comandos (visión general)**

- **General:** `ping`, `menu`, `testlid`.
- **Grupo:** `welcome`, `add`, `kick`, `promote`, `demote`, `link`, `tagall`, `mute`, `unmute`.
- **Owner:** `update`, `token`, `crearuser`.
- **Economía:** `balance`, `depositar`, `retirar`, `robar`, `diario`, `perfil`.
- **Pokemon (mini-juego):** `catch`, `battle`, `box`, `inventory`, `switch`, `train`.
- **Funciones (anti-):** `anti-link`, `anti-spam`, `anti-voice`, etc.

> Nota: estos comandos están organizados en archivos en `src/commands/`. Revisa allí para ver parámetros y permisos.

---

**Configuración y sesión**

- Guarda tus credenciales / sesiones en la carpeta `session/` (si aplica).
- Revisa `lib/connection.js` para la lógica de conexión y `lib/loader.js` para cómo se cargan los comandos dinámicamente.

**Panel web (si aplica)**

- Archivos estáticos en `public/` (dashboard, admin). Revisa `public/js/dashboard.js` para la integración con sockets.

---

**Colaboradores y créditos**

- **Owner / Maintainer:** `Fer2809fl` (repositorio original)
- **Contribuciones:** revisa la carpeta `src/` para autores de módulos y cabeceras en archivos individuales.

Si quieres añadirte como colaborador, dime tu nombre/usuario y lo agrego aquí.

---

**Licencia**

- Este proyecto incluye un archivo `LICENSE` (GPL-3.0). Revisa `LICENSE` para detalles.

---

**Contacto / Soporte**

- Abre un issue en el repositorio para bugs o solicitudes de features.
- Para integraciones personalizadas, añade una descripción en `ISSUE` o crea un PR con cambios.

---

Gracias por usar Asta — ¡que las conversaciones sean seguras y ordenadas! ✨
