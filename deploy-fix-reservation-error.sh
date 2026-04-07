#!/bin/bash

echo "🔧 ARREGLANDO ERROR DE CREACIÓN DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

echo ""
echo "📋 Paso 3: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 4: Iniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 5: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Servidor podría no estar respondiendo correctamente"
fi

echo ""
echo "📋 Paso 6: Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA ACTUALIZADO CON MEJOR LOGGING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Para ver el error exacto cuando intentes crear una reserva:"
echo "  tail -f backend.log"
echo ""
echo "🔍 El sistema ahora mostrará detalles completos del error,"
echo "   incluyendo constraint violations y otros detalles de PostgreSQL"
