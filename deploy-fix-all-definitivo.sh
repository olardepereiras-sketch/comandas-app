#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES DEFINITIVAS"
echo "=========================================="

cd /var/www/reservamesa

echo "🛑 Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo "🧹 Limpiando caché..."
rm -rf dist .expo

echo "📦 Compilando frontend..."
bunx expo export -p web

echo "🔄 Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo "⏳ Esperando inicio..."
sleep 5

echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "Prueba ahora:"
echo "1. Config Pro - Los switches deben mantenerse después de guardar"
echo "2. Nueva reserva - La mesa debe aparecer en la notificación"
echo "3. Reservations Pro - Botón contactar abre WhatsApp sin texto"
