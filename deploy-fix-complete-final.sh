#!/bin/bash
set -e

echo "🚀 DEPLOYMENT COMPLETO - Aplicando TODAS las correcciones"
echo "=========================================================="

cd /var/www/reservamesa

echo ""
echo "📋 1. Limpiando build anterior..."
rm -rf dist .expo

echo ""
echo "📦 2. Compilando frontend..."
bunx expo export -p web

echo ""
echo "🔄 3. Deteniendo servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "🚀 4. Iniciando servidor backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado con PID: $BACKEND_PID"
sleep 3

echo ""
echo "🔄 5. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "📊 Estado del servidor:"
ps aux | grep "bun.*backend/server.ts" | grep -v grep || echo "⚠️ Backend no está corriendo"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 PRUEBAS A REALIZAR:"
echo "   1. ✅ Modificar reserva desde token del cliente"
echo "   2. ✅ Borrar provincias (con confirmación y validación)"
echo "   3. ✅ Borrar poblaciones (con confirmación y validación)"
echo "   4. ✅ Borrar tipos de cocina (con confirmación)"
echo "   5. ✅ Borrar horas (con confirmación)"
echo "   6. ✅ Tipos de cocina sin prefijo 'cuisine-'"
echo ""
