# 🎮 Pokemon - Sistema de Juego Pokémon

Juego RPG completo integrado en el bot. Captura, entrena y lucha con Pokémon.

## 📂 Estructura

```
pokemon/
├── Comandos principales
│   ├── pokeInicial.js      # .oak - Elegir starter
│   ├── wild.js             # .wild - Encontrar salvajes
│   ├── catch.js            # .catch - Capturar
│   ├── battle.js           # .battle - Batalla PvP
│   ├── train.js            # .entrenar - Entrenar
│   └── team.js             # .equipo - Ver equipo
│
├── Gestión
│   ├── box.js              # .caja - Ver almacén
│   ├── release.js          # .liberar - Soltar Pokémon
│   ├── switch.js           # .cambiar - Cambiar equipo
│   ├── inventory.js        # .inventario - Items
│   ├── search.js           # .buscar - Buscar Pokémon
│   └── centroPokemon.js    # .centro - Curar
│
├── Admin
│   ├── setroute.js         # .ruta - Cambiar ubicación
│   ├── resetAll.js         # .reset - Reiniciar
│   └── (más comandos)
│
└── lib/                    # Librerías compartidas
    ├── pokemon.js          # Clase Pokémon
    ├── battle.js           # Sistema de batallas
    ├── wildBattle.js       # Batallas salvajes
    ├── catchMath.js        # Cálculos de captura
    ├── items.js            # Sistema de items
    ├── routes.js           # Rutas y ubicaciones
    ├── data.js             # Datos de Pokémon
    ├── api.js              # API PokeAPI
    ├── utils.js            # Utilidades
    ├── inventory.js        # Gestión de inventario
    ├── map.js              # Mapa del juego
    └── typeChart.js        # Tabla de tipos

```

## 🎮 Comandos Principales

- `.oak` / `.profesor` - Elegir Pokémon inicial (Bulbasaur, Charmander, Squirtle)
- `.wild` / `.salvaje` - Buscar Pokémon salvaje en tu ruta
- `.catch` / `.capturar` - Capturar Pokémon encontrado
- `.battle` / `.batalla` - Retar a otro entrenador
- `.entrenar` - Entrenar tu equipo
- `.equipo` / `.team` - Ver tu equipo Pokémon
- `.caja` / `.box` - Ver almacén (50 slots)
- `.liberar` / `.release` - Soltar Pokémon
- `.cambiar` / `.switch` - Cambiar Pokémon del equipo
- `.inventario` - Ver items
- `.buscar` - Buscar Pokémon en tu equipo
- `.centro` - Curar Pokémon
- `.ruta` - Cambiar ubicación
- `.reset` - Reiniciar (admin)

## 🔧 Sistema de Librerías

Las librerías están en `lib/` compartidas entre todos los comandos:

- **pokemon.js** - Clase Pokémon con stats, moves, growth
- **battle.js** - Gestión de batallas PvP
- **wildBattle.js** - Encuentros con Pokémon salvajes
- **catchMath.js** - Fórmulas para capturar (probabilidad)
- **items.js** - Sistema de Poké Balls y items
- **routes.js** - Definición de rutas con Pokémon por nivel
- **data.js** - Nombres en español, datos base
- **api.js** - Conexión a PokeAPI
- **utils.js** - Funciones compartidas
- **typeChart.js** - Tabla de efectividad de tipos

## 🔐 Permisos

Todos los comandos funcionan en grupos (`.group = true`).
Algunos comandos admin requieren owner.

## 📊 Datos Guardados

Los datos del usuario se guardan en memoria:

```javascript
user.pokemonV1 = {
  team: [],              // Equipo activo (max 6)
  box: [],               // Almacén (max 50)
  inventory: {},         // Items: { pokeball: 10, ... }
  currentRoute: 1,       // Ubicación actual
  level: 1,              // Nivel entrenador
  money: 0,              // Dinero
  starterClaimed: false, // ¿Reclamó inicial?
}
```

## 🎯 Flujo de Juego

1. Usar `.oak` para obtener starter
2. Ir a ruta con `.ruta` (default: ruta 1)
3. Buscar salvajes con `.wild`
4. Capturar con `.catch` usando Poké Balls
5. Entrenar en batallas salvajes
6. Retar otros con `.battle`
7. Gestionar equipo con `.equipo`, `.liberar`, etc.

## ✅ Funciones Mantenidas

- ✅ Sistema completo de captura (probabilidad por stats)
- ✅ Batallas PvP y contra salvajes
- ✅ Sistema de tipos y efectividad
- ✅ Experiencia y subida de nivel
- ✅ Movimientos y estadísticas
- ✅ Items (Poké Balls, pociones)
- ✅ Almacén y equipo
- ✅ Rutas con Pokémon específicos
- ✅ PokeAPI integrada para datos reales

## 🔧 Nota de Integración

Las librerías se importan desde `./lib/` manteniendo la estructura original.
Sistema adaptado para funcionar con el loader de comandos de Asta Bot.
