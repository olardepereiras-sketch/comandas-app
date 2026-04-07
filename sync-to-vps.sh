#!/bin/bash

echo "🔄 SINCRONIZANDO ARCHIVOS DE /home/user/rork-app A /var/www/reservamesa"
echo "================================================================"

# Detener servidor
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2

# Matar procesos de Chrome
echo "📋 Paso 2: Matando procesos de Chrome..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 1

# Sincronizar archivos
echo "📋 Paso 3: Sincronizando archivos..."
rsync -av --delete \
  --exclude 'node_modules' \
  --exclude 'backend.log' \
  --exclude '.git' \
  --exclude 'bun.lock' \
  /home/user/rork-app/ /var/www/reservamesa/

echo "📋 Paso 4: Verificando archivos críticos..."
if [ -f "/var/www/reservamesa/app/client/reservation2/[token2].tsx" ]; then
  echo "✅ Archivo de token2 sincronizado correctamente"
else
  echo "❌ ERROR: Archivo de token2 NO se copió"
  exit 1
fi

# Cambiar al directorio correcto
cd /var/www/reservamesa

# Reinstalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
  echo "📋 Paso 5: Instalando dependencias..."
  bun install
fi

# Reiniciar servidor
echo "📋 Paso 6: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

# Esperar inicio
echo "📋 Paso 7: Esperando inicio del servidor (10 segundos)..."
sleep 10

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo correctamente"
else
  echo "❌ ERROR: El servidor no está corriendo"
  tail -30 backend.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SINCRONIZACIÓN Y DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  cd /var/www/reservamesa && tail -f backend.log"
echo ""
echo "📋 Últimas líneas del log:"
tail -20 /var/www/reservamesa/backend.log
