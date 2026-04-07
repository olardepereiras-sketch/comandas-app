#!/bin/bash

echo "🚀 Despliegue Final - Fix Borrado y Cancelación"
echo "════════════════════════════════════════════════════════════════"

# 1. Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true

# 2. Detener servidor
echo ""
echo "📋 1. Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2

# 3. Limpiar y compilar frontend
echo ""
echo "📋 2. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web

# 4. Iniciar servidor
echo ""
echo "📋 3. Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

# 5. Recargar nginx
echo ""
echo "📋 4. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null || echo "⚠️  nginx no se pudo recargar"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Despliegue completado"
echo ""
echo "🔍 Para ver logs en tiempo real:"
echo "   tail -f backend.log"
echo ""
echo "🧪 Ahora intenta:"
echo "   1. Eliminar un usuario desde: http://200.234.236.133/admin/users"
echo "   2. Anular una reserva desde: http://200.234.236.133/restaurant/reservations-pro"
echo "   3. Las reservas anuladas deberían verse en gris con botón 'Recuperar'"
echo ""
