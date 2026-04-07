#!/bin/bash

echo "🚀 Desplegando correcciones finales..."
echo "=========================================="

cd /var/www/reservamesa

echo ""
echo "📦 Instalando dependencias..."
bun install

echo ""
echo "🔨 Construyendo aplicación..."
bun run build

echo ""
echo "♻️  Reiniciando servidor con PM2..."
pm2 restart reservamesa || pm2 start bun --name reservamesa -- run backend/server.ts

echo ""
echo "✅ Despliegue completado exitosamente!"
echo ""
echo "📋 Cambios aplicados:"
echo "  ✓ Eliminación de clientes con reservas habilitada"
echo "  ✓ Funcionalidad de anulación de reservas corregida"
echo "  ✓ Tipos de comida por provincia en admin/restaurants"
echo "  ✓ Campo de teléfono separado en prefijo y número"
echo ""
echo "🌐 Aplicación disponible en: http://200.234.236.133"
