#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Modificación de Reservas y Reservas Pro"
echo "================================================================"

echo ""
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" || true

echo ""
echo "🗑️  2. Limpiando builds antiguos..."
rm -rf dist .expo

echo ""
echo "📦 3. Compilando frontend (~90 segundos)..."
bunx expo export -p web

if [ ! -d "dist" ]; then
  echo "   ❌ Error: No se generó la carpeta dist"
  exit 1
fi

echo ""
echo "✅ 4. Frontend compilado correctamente"

echo ""
echo "🚀 5. Iniciando servidor backend..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   ✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "🔄 6. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📋 CAMBIOS APLICADOS:"
echo "   • Reservas Pro: Ahora carga correctamente el restaurantId"
echo "   • Modificación de reservas:"
echo "     - Se liberan las mesas temporalmente durante la modificación"
echo "     - Se conserva el token y número de reserva original"
echo "     - El restaurante recibe notificación del cambio"
echo "     - El cliente vuelve a la pantalla de reserva con los datos actualizados"
echo ""
echo "🌐 La aplicación está disponible en: https://quieromesa.com"
echo "📊 Logs del servidor: tail -f backend.log"
echo ""
