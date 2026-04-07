#!/bin/bash

echo "🚀 Desplegando correcciones de sistema de turnos..."

echo "📋 Paso 1: Corrigiendo estructura de base de datos..."
bun run backend/db/fix-all-shifts-schema.ts

echo "📋 Paso 2: Limpiando archivos anteriores..."
rm -rf dist .expo

echo "📋 Paso 3: Compilando frontend..."
bunx expo export -p web

echo "📋 Paso 4: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "📋 Paso 5: Recargando nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado exitosamente"
echo ""
echo "🔍 Verifica que todo funcione correctamente:"
echo "   - http://tu-dominio/restaurant/schedules (crear plantillas de turnos)"
echo "   - http://tu-dominio/restaurant/reservations-pro (habilitar/deshabilitar días)"
