#!/bin/bash

echo "🔧 Solucionando módulo Fianzas y Admin Stripe..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Ejecutar script de corrección
echo "📋 1. Actualizando base de datos..."
bun backend/db/fix-deposits-and-admin-stripe.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error al actualizar la base de datos"
  exit 1
fi

# 2. Limpiar caché
echo ""
echo "📋 2. Limpiando caché..."
rm -rf dist .expo node_modules/.cache

# 3. Exportar web
echo ""
echo "📋 3. Exportando para web..."
bunx expo export -p web --clear

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error al exportar para web"
  exit 1
fi

# 4. Reiniciar backend
echo ""
echo "📋 4. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Servidor iniciado con PID: $BACKEND_PID"

# 5. Recargar nginx
echo ""
echo "📋 5. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ¡Corrección completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "El módulo 'Fianzas' ahora debería aparecer en el panel de todos los restaurantes"
echo "y la configuración de Stripe en Admin debería funcionar correctamente."
echo ""
echo "Para ver los logs del backend:"
echo "  tail -f backend.log"
echo ""
