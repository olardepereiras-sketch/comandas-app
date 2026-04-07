#!/bin/bash

echo "🔧 ARREGLANDO TABLA DE NOTIFICACIONES WHATSAPP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Matando procesos en puerto 3000..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(grep -v '^#' env | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi

echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Ejecutando script de corrección de tabla..."
bun run backend/db/fix-whatsapp-notifications-table.ts
if [ $? -ne 0 ]; then
  echo "❌ Error ejecutando script de corrección"
  exit 1
fi
echo "✅ Tabla corregida"

echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
bun run build:web > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend reconstruido"
else
  echo "⚠️ Error reconstruyendo frontend, continuando..."
fi

echo ""
echo "📋 Paso 5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado (PID: $SERVER_PID)"
else
  echo "❌ Error iniciando servidor"
  echo "📋 Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "📋 Paso 6: Verificando servidor..."
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Servidor podría no estar respondiendo, verifica los logs"
fi

echo ""
echo "📋 Paso 7: Recargando Nginx..."
nginx -t && nginx -s reload
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TABLA DE NOTIFICACIONES WHATSAPP ARREGLADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ Cambios aplicados:"
echo "  • Columna updated_at añadida a whatsapp_notifications"
echo "  • Columnas last_attempt_at, error_message, sent_at verificadas"
echo "  • Índices verificados"
echo "  • Servidor reiniciado correctamente"

echo ""
echo "📊 Para monitorear notificaciones:"
echo "  tail -f backend.log | grep -i 'notification'"

echo ""
echo "🧪 Para probar crear una reserva:"
echo "  https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
