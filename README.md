# 🤖 Asta Bot v2.0.0

Bot de WhatsApp Multi-Dispositivo basado en **Baileys**.

## 📁 Estructura

```
PROYECTO-BOT/
├── index.js                # Punto de entrada
├── lib/
│   ├── connection.js       # WASocket + eventos
│   ├── loader.js           # Carga dinámica de comandos
│   ├── message-handler.js  # Router de mensajes
│   ├── print.js            # Logs de consola
│   └── store.js            # Store Baileys
├── src/
│   ├── commands/           # Comandos por categoría
│   │   ├── general/        # menu, ping, testlid
│   │   ├── owner/          # update
│   │   ├── group/          # welcome, group-events
│   │   └── serbot/         # qr, code, delsub, bots
│   └── database/
│       └── config.js       # Configuración global
├── session/                # Auth principal
└── package.json
```

## 🚀 Inicio rápido

```bash
npm install
npm start
```

## 📂 Comandos

| Categoría | Comandos |
|-----------|----------|
| General | `.menu`, `.ping`, `.testlid` |
| Owner | `.update` |
| Grupo | `.welcome`, `.welcomeon`, `.welcomeoff` |
| Serbot | `.qr`, `.code`, `.bots`, `.delsub` |

## 📄 Licencia

GPL - 3.0 — Ver `LICENSE`.

---

**© Asta Bot — Todos los derechos reservados**
