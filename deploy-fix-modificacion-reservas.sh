#!/bin/bash

echo "🔧 CORRIGIENDO MODIFICACIÓN DE RESERVAS Y MENSAJES"
echo "=================================================="

echo "⏹️  1. Deteniendo backend..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo "🚀 2. Iniciando backend..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

echo "   Backend PID: $BACKEND_PID"

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔧 Correcciones aplicadas:"
echo "   ✅ Query de disponibilidad de slots corregida"
echo "   ✅ Formato de fecha: 'domingo, 11/01/2026'"
echo "   ✅ Comentarios del cliente agregados al mensaje"
echo "   ✅ URL corregida a https://quieromesa.com"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 Prueba la modificación de reserva en:"
echo "   https://quieromesa.com/client/reservation/modify/[token]"
