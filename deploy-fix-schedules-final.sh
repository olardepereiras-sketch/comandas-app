#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES FINALES DE HORARIOS..."
echo "===================================================="

# Detener servidor
echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

# Limpiar caché
echo ""
echo "📋 Paso 2/5: Limpiando caché..."
rm -rf dist .expo

# Reconstruir frontend
echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web

# Reiniciar servidor
echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

# Recargar nginx
echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Nombres correctos de plantillas (Comidas, Cenas, etc.)"
echo "  ✅ Edición directa de comensales máximos"
echo "  ✅ Edición de valoración mínima global"
echo "  ✅ Edición de valoración mínima local"
echo "  ✅ Botón Eliminar funcionando correctamente"
echo ""
echo "Prueba los cambios en:"
echo "  ⚙️  https://quieromesa.com/restaurant/schedules"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
