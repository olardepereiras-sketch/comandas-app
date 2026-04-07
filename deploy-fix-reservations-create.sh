#!/bin/bash

set -e

echo "🔧 ARREGLANDO ERROR DE CREACIÓN DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Error: Archivo env no encontrado"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi
echo "✅ DATABASE_URL configurada: ${DATABASE_URL:0:50}..."

echo ""
echo "📋 Paso 3: Verificando y arreglando esquema de reservations..."
DATABASE_URL="$DATABASE_URL" bun backend/db/fix-reservations-create-error.ts
if [ $? -eq 0 ]; then
  echo "✅ Esquema corregido"
else
  echo "❌ Error corrigiendo esquema"
  exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 6: Verificando servidor..."
sleep 2
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "❌ Servidor no responde"
  echo "📊 Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "📋 Paso 7: Recargando Nginx..."
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ERROR DE RESERVAS CORREGIDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • Esquema de tabla reservations corregido"
echo "  • Columnas faltantes añadidas"
echo "  • Servidor reiniciado correctamente"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
