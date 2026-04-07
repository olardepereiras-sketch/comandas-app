#!/bin/bash

echo "🔧 ARREGLANDO WHATSAPP WORKER - ERROR DE POOL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Matar TODOS los procesos de bun en puerto 3000
echo ""
echo "📋 Paso 1: Matando procesos en puerto 3000..."
pkill -9 -f "bun.*backend/server.ts" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2
echo "✅ Procesos eliminados"

# Paso 2: Verificar que el puerto está libre
echo ""
echo "📋 Paso 2: Verificando puerto 3000..."
if lsof -i:3000 > /dev/null 2>&1; then
  echo "❌ Puerto 3000 aún ocupado. Matando con fuerza..."
  fuser -k 3000/tcp 2>/dev/null
  sleep 2
fi
echo "✅ Puerto 3000 libre"

# Paso 3: Limpiar y reconstruir frontend
echo ""
echo "📋 Paso 3: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"

# Paso 4: Verificar archivo env
echo ""
echo "📋 Paso 4: Verificando variables de entorno..."
if [ ! -f "env" ]; then
  echo "❌ Archivo env no encontrado"
  exit 1
fi

# Verificar que DATABASE_URL existe
if ! grep -q "DATABASE_URL=" env; then
  echo "❌ DATABASE_URL no encontrada en env"
  exit 1
fi

echo "✅ Variables verificadas"

# Paso 5: Iniciar servidor
echo ""
echo "📋 Paso 5: Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3

# Paso 6: Verificar que el servidor está corriendo
echo ""
echo "📋 Paso 6: Verificando servidor..."
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo (PID: $SERVER_PID)"
else
  echo "❌ Error iniciando servidor. Mostrando últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

# Esperar un poco más y verificar que no haya errores
sleep 2
if ! ps -p $SERVER_PID > /dev/null; then
  echo "❌ Servidor se detuvo. Log:"
  tail -30 backend.log
  exit 1
fi

# Paso 7: Probar endpoint
echo ""
echo "📋 Paso 7: Probando endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "❌ Servidor no responde (código: $RESPONSE)"
  echo "Mostrando log:"
  tail -20 backend.log
  exit 1
fi

# Paso 8: Recargar Nginx
echo ""
echo "📋 Paso 8: Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WHATSAPP WORKER ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • WhatsApp Worker ahora usa el Pool compartido"
echo "  • Pool se crea DESPUÉS de cargar variables de entorno"
echo "  • No más error de contraseña"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Para verificar que no hay errores de password:"
echo "  grep -i 'password' backend.log"
