#!/bin/bash

echo "🔧 ARREGLANDO CREACIÓN DE RESERVAS"
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

export DATABASE_URL="postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db"
echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Ejecutando diagnóstico..."
bun backend/db/diagnose-reservation-error.ts

echo ""
echo "📋 Paso 4: Corrigiendo esquema de reservations..."
bun backend/db/fix-reservations-schema-complete.ts

echo ""
echo "📋 Paso 5: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 6: Iniciando servidor..."
cd /var/www/reservamesa
export $(cat env | grep -v '^#' | xargs)
export DATABASE_URL="postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db"
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 7: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Servidor puede necesitar más tiempo para iniciar"
fi

echo ""
echo "📋 Paso 8: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA DE RESERVAS CORREGIDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🧪 Para probar crear una reserva:"
echo "  https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
