#!/bin/bash

echo "🔧 ARREGLANDO COLUMNA ROTATION_TIME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"

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
echo "📋 Paso 3: Añadiendo columna rotation_time_minutes..."
cd /var/www/reservamesa
bun run backend/db/add-rotation-time-to-tables.ts

if [ $? -eq 0 ]; then
  echo "✅ Columna añadida"
else
  echo "❌ Error añadiendo columna"
  exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
rm -rf dist .expo node_modules/.cache 2>/dev/null || true
bun run export
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor con variables de entorno..."
cd /var/www/reservamesa
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado en background"

echo ""
echo "📋 Paso 6: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️  Servidor puede estar iniciando..."
fi

echo ""
echo "📋 Paso 7: Recargando Nginx..."
nginx -t && systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COLUMNA ROTATION_TIME ARREGLADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • Columna rotation_time_minutes añadida a tabla tables"
echo "  • Valor por defecto: 120 minutos"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
