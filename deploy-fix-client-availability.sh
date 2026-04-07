#!/bin/bash
set -e

echo "🔧 Desplegando correcciones de disponibilidad y WhatsApp"
echo "========================================================"

echo ""
echo "📦 1. Reconstruyendo el backend..."
cd /var/www/reservamesa
bun install

echo ""
echo "🔄 2. Reiniciando el servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📊 Cambios aplicados:"
echo "   ✅ Los días abiertos manualmente ahora están disponibles para clientes"
echo "   ✅ El mensaje de WhatsApp desde email ahora incluye todos los detalles"
echo "   ✅ Mensaje personalizado de WhatsApp incluido en el enlace del email"
echo ""
echo "🔍 Ver logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
