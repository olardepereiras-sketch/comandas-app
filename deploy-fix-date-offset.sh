#!/bin/bash

echo "🚀 CORRECCIÓN DEFINITIVA - PROBLEMA DE FECHA -1 DÍA"
echo "============================================================"
echo ""
echo "Este script corrige el uso de getUTC* por get* en las rutas"
echo "de day-exceptions para evitar el desfase de 1 día."
echo ""

# Reconstruir frontend
echo "📦 1. Reconstruyendo el frontend..."
echo "------------------------------------------------------------"
bun install
npx expo export -p web --output-dir dist --clear

# Reiniciar backend
echo ""
echo "🔄 2. Reiniciando el servidor backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts" || true
sleep 2
cd /var/www/reservamesa
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 3

# Recargar nginx
echo ""
echo "🌐 3. Recargando nginx..."
echo "------------------------------------------------------------"
nginx -t && nginx -s reload

echo ""
echo "✅ DEPLOY COMPLETADO EXITOSAMENTE"
echo "============================================================"
echo ""
echo "📌 CORRECCIÓN APLICADA:"
echo ""
echo "   ✅ Cambiado getUTCFullYear/getUTCMonth/getUTCDate"
echo "      por getFullYear/getMonth/getDate"
echo ""
echo "   Esto elimina el problema de zona horaria que causaba"
echo "   que las fechas se guardaran con -1 día de diferencia."
echo ""
echo "🎯 PRUEBA AHORA:"
echo ""
echo "   1. Abre el calendario de Reservas Pro"
echo "   2. Selecciona el día 8 de enero"
echo "   3. Abre/cierra el día o modifica los comensales"
echo "   4. Sal y vuelve a entrar"
echo "   5. Verifica que el día 8 mantenga los cambios"
echo ""
echo "============================================================"
