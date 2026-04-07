# 🚀 INSTRUCCIONES DE DESPLIEGUE - SOLUCIÓN PANTALLA EN BLANCO

## ❌ PROBLEMA
Cuando los clientes hacen clic en el token de confirmación de reserva, aparece una pantalla en blanco (error 500).

## ✅ SOLUCIÓN
El problema es que nginx está intentando servir archivos estáticos, pero esta es una aplicación Expo que necesita un servidor corriendo para manejar las rutas dinámicas.

## 📋 PASOS PARA DESPLEGAR

### 1. Subir archivos con WinSCP
Sube estos archivos a `/var/www/reservamesa`:
- `nginx-quieromesa.conf`
- `fix-token-screen-complete.sh`
- `start-web-server.sh`

### 2. Dar permisos de ejecución
```bash
cd /var/www/reservamesa
chmod +x fix-token-screen-complete.sh
chmod +x start-web-server.sh
```

### 3. Ejecutar el script de despliegue
```bash
cd /var/www/reservamesa
bash fix-token-screen-complete.sh
```

### 4. Verificar que todo funciona
```bash
# Verificar backend
tail -f /var/www/reservamesa/backend.log

# Verificar servidor web
tail -f /var/www/reservamesa/web-server.log

# Verificar nginx
tail -f /var/log/nginx/quieromesa-error.log
```

## 🧪 PROBAR LA SOLUCIÓN

1. Ir a https://quieromesa.com
2. Crear una nueva reserva
3. Hacer clic en el enlace del token que llega por WhatsApp
4. Ahora debería aparecer la pantalla de confirmación de reserva

## 🔧 CÓMO FUNCIONA

### Antes (con error):
```
Cliente hace clic en token
    ↓
nginx busca archivo estático
    ↓
No encuentra nada
    ↓
ERROR 500
```

### Ahora (corregido):
```
Cliente hace clic en token
    ↓
nginx hace proxy a servidor Expo (puerto 8081)
    ↓
Expo Router maneja la ruta dinámica
    ↓
Renderiza app/client/reservation2/[token2].tsx
    ↓
PANTALLA CORRECTA ✓
```

## 📝 ARQUITECTURA

```
quieromesa.com
    │
    ├─ /api/* ────────────> Backend (puerto 3000)
    │                        - tRPC
    │                        - PostgreSQL
    │                        - WhatsApp
    │
    └─ /* ────────────────> Frontend (puerto 8081)
                             - Expo Router
                             - React Native Web
                             - Rutas dinámicas
```

## ⚠️ IMPORTANTE

1. **Ambos servidores deben estar corriendo**:
   - Backend en puerto 3000
   - Servidor web de Expo en puerto 8081

2. **Reiniciar después de cambios**:
   ```bash
   bash fix-token-screen-complete.sh
   ```

3. **Monitorear logs**:
   - Si hay problemas, revisar `web-server.log` primero

## 🆘 SOLUCIÓN DE PROBLEMAS

### Si sigue apareciendo pantalla en blanco:

1. Verificar que el servidor web está corriendo:
   ```bash
   ps aux | grep "bunx rork"
   ```

2. Ver logs del servidor web:
   ```bash
   tail -100 /var/www/reservamesa/web-server.log
   ```

3. Verificar nginx:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. Reiniciar todo:
   ```bash
   bash fix-token-screen-complete.sh
   ```

### Si el servidor web no inicia:

1. Limpiar todo:
   ```bash
   cd /var/www/reservamesa
   rm -rf .expo node_modules/.cache
   pkill -f "bunx rork"
   ```

2. Instalar dependencias:
   ```bash
   bun install
   ```

3. Reiniciar:
   ```bash
   bash start-web-server.sh
   ```

## 📞 SOPORTE

Si después de seguir todos los pasos sigue sin funcionar, compartir:
1. Contenido de `web-server.log`
2. Contenido de `/var/log/nginx/quieromesa-error.log`
3. Resultado de `ps aux | grep bunx`
