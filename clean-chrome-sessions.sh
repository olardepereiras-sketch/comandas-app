#!/bin/bash

echo "🧹 Limpiando sesiones de Chrome bloqueadas..."

# Matar todos los procesos Chrome/Chromium relacionados con WhatsApp
echo "🔪 Matando procesos Chrome..."
pkill -9 -f "chrome.*whatsapp-sessions" 2>/dev/null || echo "No hay procesos Chrome activos"
pkill -9 -f "chromium.*whatsapp-sessions" 2>/dev/null || echo "No hay procesos Chromium activos"

# Esperar a que los procesos terminen
sleep 3

# Limpiar archivos de bloqueo
echo "🗑️ Limpiando archivos de bloqueo..."
SESSIONS_DIR="/var/www/reservamesa/whatsapp-sessions"

if [ -d "$SESSIONS_DIR" ]; then
    find "$SESSIONS_DIR" -name "SingletonLock" -delete 2>/dev/null
    find "$SESSIONS_DIR" -name "lockfile" -delete 2>/dev/null
    find "$SESSIONS_DIR" -name "SingletonSocket" -delete 2>/dev/null
    find "$SESSIONS_DIR" -name "SingletonCookie" -delete 2>/dev/null
    echo "✅ Archivos de bloqueo eliminados"
else
    echo "⚠️ Directorio de sesiones no encontrado: $SESSIONS_DIR"
fi

# Mostrar procesos Chrome restantes
echo ""
echo "📊 Procesos Chrome/Chromium activos:"
ps aux | grep -i chrome | grep -v grep || echo "Ninguno"

echo ""
echo "✅ Limpieza completada"
echo ""
echo "💡 Ahora reinicia el servidor con: pm2 restart all"
