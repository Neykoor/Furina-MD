# 🧪 Prueba Rápida del Sistema Pokémon

## ✅ Verificación Previa (Completada)
- ✅ 14 comandos con sintaxis correcta
- ✅ 13 librerías en lib/ disponibles
- ✅ Todos los imports apuntan a ./lib/
- ✅ Handler metadata configurado
- ✅ Exportaciones validadas

## 🚀 Cómo Probar

### 1. Iniciar el Bot
```bash
npm start
```

### 2. Prueba Básica (en grupo de WhatsApp)
```
Mensaje 1: .oak
Respuesta: Deberías ver opciones para elegir starter

Mensaje 2: .wild
Respuesta: Deberías encontrar un Pokémon salvaje

Mensaje 3: .catch
Respuesta: Intento de captura

Mensaje 4: .team
Respuesta: Tu equipo Pokémon
```

### 3. Prueba de Batallas
```
Mensaje 1: .battle @usuario
Respuesta: Invitación a batalla

Mensaje 2 (otro usuario): .accept_battle (o similar)
Respuesta: Batalla iniciada
```

### 4. Prueba de Persistencia
1. Captura algunos Pokémon
2. Reinicia el bot
3. Usa `.team` - Los Pokémon deberían estar ahí

## 🔍 Debugging

### Si falla un comando:
1. Revisa la consola del bot para errores
2. Verifica que estés en un grupo (`.group = true`)
3. Confirma que el usuario tiene datos inicializados

### Si no encuentra las librerías:
```bash
# Verifica que existan
ls src/commands/pokemon/lib/
```

### Si falla initUser:
- Asegúrate que `global.db` existe
- Verifica que `global.db.data.users` está inicializado
- Comprueba en lib/utils.js la función `initUser`

## 📊 Esperado

Todos los comandos deberían:
- ✅ Ser reconocidos por el loader (aparecen en `.help`)
- ✅ Responder sin errores
- ✅ Guardar datos correctamente
- ✅ Mantener estado entre mensajes

## ⚠️ Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Handler no reconocido" | Reinicia el bot con `npm start` |
| "No se encuentra módulo" | Verifica ruta en imports (debe ser `./lib/`) |
| "Datos no persisten" | Revisa `global.db.data.users` en main del bot |
| "Error en batalla" | Verifica estado en maps de `utils.js` |

## 📝 Notas de Desarrollo

- Datos guardados en: `global.db.data.users[jid].pokemonV1`
- Estado de batalla: mapas en `utils.js` (activeWildBattles, activePvpBattles)
- API: PokeAPI en `lib/api.js`
- Rutas: Definidas en `lib/routes.js`

¡Listo para probar! 🎮
