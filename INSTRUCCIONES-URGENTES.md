# 🚨 SOLUCIÓN URGENTE - PANTALLA EN BLANCO DEL TOKEN

## El Problema Real

Según los logs, el **BACKEND está funcionando perfectamente**:
```
✅ [GET RESERVATION BY TOKEN2] Reserva pendiente encontrada: res-1770572959816
📤 [GET RESERVATION BY TOKEN2] Datos retornados: {...todos los datos...}
```

El problema es el **FRONTEND** - el componente no se está renderizando.

## Diagnóstico Inmediato

Ejecuta esto en tu VPS en `/var/www/reservamesa`:

```bash
# 1. Verifica que el archivo frontend existe
ls -lh app/client/reservation2/\[token2\].tsx

# 2. Verifica los últimos cambios
tail -100 backend.log | grep "RESERVATION2"

# 3. Verifica el proceso
ps aux | grep bun
```

## Posibles Causas

1. **El bundle de frontend no está actualizado** (más probable)
2. **Error de JavaScript en el navegador** que detiene la renderización
3. **Problema de rutas en Expo Router**

## Solución: Limpiar Caché y Rebuild

```bash
cd /var/www/reservamesa

# Detener todo
pkill -f "bun.*server.ts"
pkill -f chrome
pkill -f chromium
sleep 2

# Limpiar cachés
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .next 2>/dev/null || true

# Reinstalar dependencias
bun install

# Reiniciar
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 10

# Ver logs
tail -f backend.log
```

## Verificación en el Navegador

1. Abre el enlace del token: `https://tu-dominio.com/client/reservation2/token2-xxxxx`
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Busca mensajes que empiecen con `🔍 [RESERVATION2 SCREEN]`
5. **Toma screenshot** de TODOS los errores en rojo

## Si Ves Errores

Copia TODOS los errores que veas en la consola del navegador y envíamelos.

## Verificación Rápida del Componente

```bash
cd /var/www/reservamesa
head -30 app/client/reservation2/\[token2\].tsx
```

Debe mostrar:
```
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet...
```

Si no muestra nada o da error, el archivo no existe y hay que copiarlo desde la ubicación correcta.

## Script de Emergencia

Guarda esto como `/var/www/reservamesa/emergency-fix.sh`:

```bash
#!/bin/bash
cd /var/www/reservamesa

echo "🚨 REINICIO DE EMERGENCIA"
pkill -9 -f "bun.*server"
pkill -9 -f chrome
sleep 3
rm -rf .expo node_modules/.cache
nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Reiniciado. Espera 15 segundos antes de probar."
sleep 15
tail -30 backend.log
```

Ejecútalo con:
```bash
chmod +x /var/www/reservamesa/emergency-fix.sh
bash /var/www/reservamesa/emergency-fix.sh
```

## Necesito de Ti

Para ayudarte eficientemente, necesito que me envíes:

1. **Screenshot de la consola del navegador** cuando abres el token (F12 → Console)
2. **Output de este comando**:
   ```bash
   cd /var/www/reservamesa && ls -lh app/client/reservation2/
   ```
3. **Las primeras 50 líneas del componente**:
   ```bash
   cd /var/www/reservamesa && head -50 app/client/reservation2/\[token2\].tsx
   ```

Con esa información podré darte una solución exacta y definitiva.
