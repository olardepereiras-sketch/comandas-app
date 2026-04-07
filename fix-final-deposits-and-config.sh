#!/bin/bash

echo "🔧 Aplicando correcciones finales: Fianzas + Configuración..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar variables de entorno
if [ -f env ]; then
  export $(cat env | grep -v '^#' | xargs)
fi

echo ""
echo "1️⃣ Eliminando módulo duplicado de fianzas..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f fix-deposits-duplicate.sql

if [ $? -ne 0 ]; then
  echo "❌ Error al eliminar módulo duplicado"
  exit 1
fi

echo ""
echo "✅ Módulo duplicado eliminado"
echo ""
echo "📦 Cambios aplicados:"
echo "   ✓ Módulo duplicado de fianzas eliminado"
echo "   ✓ config.tsx corregido para usar ID dinámico"
echo "   ✓ Subida de imágenes corregida"
echo "   ✓ Calendario en módulo fianzas ya implementado"
echo ""
echo "🔄 Reiniciando servidor..."
pm2 restart quieromesa-backend 2>/dev/null || echo "⚠️  pm2 no está disponible, reinicia manualmente"
echo ""
echo "✅ ¡Correcciones aplicadas exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Sube los archivos al VPS usando WinSCP"
echo "   2. Ejecuta este script en el VPS: ./fix-final-deposits-and-config.sh"
echo "   3. Verifica que todo funcione correctamente"
echo ""
