#!/bin/bash

echo "🔧 Inicializando esquema completo de PostgreSQL..."
echo ""

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Ejecutando inicialización completa del esquema..."
cd /var/www/reservamesa
DATABASE_URL=postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db bun backend/db/init-complete-schema-fixed.ts

if [ $? -ne 0 ]; then
  echo "❌ Error al inicializar el esquema"
  exit 1
fi

echo ""
echo "📋 Paso 3: Reiniciando servidor..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
sleep 3
sudo systemctl reload nginx
echo "✅ Servidor reiniciado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ESQUEMA COMPLETO INICIALIZADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
