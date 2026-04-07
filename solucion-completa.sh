#!/bin/bash

echo "🔧 SOLUCIÓN COMPLETA - RESERVAMESA"
echo "===================================="

cd /var/www/reservamesa

# Paso 1: Detener servicios
echo ""
echo "1️⃣ Deteniendo servicios..."
pkill -f bun
sleep 2

# Paso 2: Verificar y corregir base de datos
echo ""
echo "2️⃣ Verificando base de datos..."
PROVINCIAS=$(PGPASSWORD=tu_password_seguro psql -h localhost -U reservamesa_user -d reservamesa -t -c "SELECT COUNT(*) FROM provinces;")
echo "Provincias actuales: $PROVINCIAS"

if [ "$PROVINCIAS" -lt 1 ]; then
  echo "⚠️ No hay provincias. Ejecutando reset de base de datos..."
  bun --env-file .env backend/db/reset-complete.ts
  echo "✅ Base de datos reiniciada"
else
  echo "✅ Base de datos tiene datos"
fi

# Paso 3: Limpiar caches
echo ""
echo "3️⃣ Limpiando caches..."
rm -rf .expo node_modules/.cache dist

# Paso 4: Reinstalar dependencias
echo ""
echo "4️⃣ Reinstalando dependencias..."
bun install

# Paso 5: Exportar frontend
echo ""
echo "5️⃣ Exportando frontend (2-3 minutos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
  echo "❌ Error: No se pudo crear dist/"
  exit 1
fi

# Paso 6: Iniciar backend
echo ""
echo "6️⃣ Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 5

# Paso 7: Verificar backend
echo ""
echo "7️⃣ Verificando backend..."
HEALTH_CHECK=$(curl -s http://127.0.0.1:3000/api/health)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
  echo "✅ Backend respondiendo correctamente"
else
  echo "❌ Backend no responde"
  echo "Logs:"
  tail -20 backend.log
  exit 1
fi

# Paso 8: Probar endpoint tRPC
echo ""
echo "8️⃣ Probando endpoint tRPC..."
sleep 2
TRPC_TEST=$(curl -s -X GET "http://127.0.0.1:3000/api/trpc/locations.provinces?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D")
echo "Respuesta tRPC: $TRPC_TEST"

if [[ $TRPC_TEST == *"id"* ]]; then
  echo "✅ tRPC funcionando correctamente"
else
  echo "⚠️ tRPC podría tener problemas"
fi

# Paso 9: Verificación final
echo ""
echo "9️⃣ Verificación final de base de datos..."
echo "Provincias:"
PGPASSWORD=tu_password_seguro psql -h localhost -U reservamesa_user -d reservamesa -c "SELECT id, name FROM provinces;"

echo ""
echo "Admin users:"
PGPASSWORD=tu_password_seguro psql -h localhost -U reservamesa_user -d reservamesa -c "SELECT username, email FROM admin_users;"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SOLUCIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs:"
echo "   http://200.234.236.133"
echo "   http://200.234.236.133/admin/login"
echo "   http://200.234.236.133/admin/locations"
echo ""
echo "🔑 Credenciales:"
echo "   Usuario: tono"
echo "   Password: 1234"
echo ""
echo "📊 Ver logs:"
echo "   tail -f backend.log"
echo ""
