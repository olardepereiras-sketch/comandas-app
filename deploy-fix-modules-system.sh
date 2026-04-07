#!/bin/bash

echo "🚀 Desplegando correcciones del sistema de módulos..."
echo "========================================"

# Rebuild frontend
echo ""
echo "🔨 Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error en build del frontend"
  exit 1
fi

echo "✅ Frontend reconstruido"

# Restart backend
echo ""
echo "🔄 Reiniciando backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Backend reiniciado"

# Reload nginx
echo ""
echo "🌐 Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "Cambios aplicados:"
echo "- ✅ Corrección para eliminar planes de suscripción"
echo "- ✅ Corrección para eliminar duraciones de suscripción"
echo "- ✅ Los módulos ahora se obtienen del plan de suscripción correctamente"
echo "- ✅ Botón de activar/desactivar restaurante funcional"
echo "- ✅ Botón de copiar enlace funcional con mejor manejo de errores"
echo ""
echo "🔍 Verifica que todo funcione correctamente:"
echo "  1. Intenta eliminar un plan de suscripción en /admin/modules"
echo "  2. Intenta eliminar una duración en /admin/modules"
echo "  3. Activa/desactiva módulos en un plan y verifica que se reflejen en /restaurant"
echo "  4. Usa el botón de activar/desactivar en el panel del restaurante"
echo "  5. Usa el botón 'Mi Enlace' para copiar el enlace del restaurante"
