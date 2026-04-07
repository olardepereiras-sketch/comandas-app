#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES URGENTES..."
echo "========================================"
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/4: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Admin/Usuarios: Ahora muestra todos los clientes correctamente"
echo "  ✅ Módulo Horarios: Botón eliminar plantillas funcionando"
echo "  ✅ Script de diagnóstico: Para O Lar de Pereiras"
echo ""
echo "Para ejecutar diagnóstico:"
echo "  chmod +x diagnose-available-hours-complete.sh"
echo "  ./diagnose-available-hours-complete.sh"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
