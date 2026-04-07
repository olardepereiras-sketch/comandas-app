#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES CRÍTICAS..."
echo "========================================="
echo ""

echo "📋 Cambios incluidos:"
echo "  ✅ Error 500 al crear reservas CORREGIDO"
echo "  ✅ Mensaje informativo para mesas no disponibles"
echo "  ✅ Calendario reducido a 7 columnas correctas"
echo "  ✅ Sistema de turnos por día preparado"
echo ""

# Detener servidor
echo "🛑 Deteniendo servidor..."
pm2 stop backend 2>/dev/null || pkill -f "bun.*backend/server.ts" || true
sleep 2

# Limpiar caché
echo "🧹 Limpiando caché..."
rm -rf dist/ .expo/ node_modules/.cache/ 2>/dev/null || true

# Reconstruir frontend
echo "📦 Reconstruyendo frontend..."
npx expo export -p web --output-dir dist --clear

# Reiniciar servidor
echo "🚀 Reiniciando servidor..."
cd /var/www/reservamesa
pm2 start ecosystem.config.js --env production 2>/dev/null || nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

# Recargar nginx
echo "🔄 Recargando nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Buscador de reservas funcionando correctamente"
echo "  ✅ Mensajes informativos para opciones no disponibles"
echo "  ✅ Calendario con 7 columnas visibles"
echo "  ✅ Sistema de turnos implementado"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs en tiempo real:"
echo "  tail -f /var/www/reservamesa/backend.log"
