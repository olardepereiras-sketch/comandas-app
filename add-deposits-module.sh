#!/bin/bash

echo "🔄 Agregando módulo de fianzas a la base de datos..."

cd /var/www/reservamesa

# Ejecutar el script de migración
bun backend/db/add-deposits-module.ts

if [ $? -eq 0 ]; then
  echo "✅ Módulo de fianzas agregado exitosamente"
  
  # Reiniciar el servidor para que tome los cambios
  echo "🔄 Reiniciando servidor..."
  pkill -f "bun.*backend/server.ts"
  bun backend/server.ts > backend.log 2>&1 &
  
  echo "✅ Servidor reiniciado"
  echo ""
  echo "📋 El módulo 'Fianzas' ya está disponible en:"
  echo "   - https://quieromesa.com/admin/modules"
  echo ""
  echo "🎯 Ahora puedes:"
  echo "   1. Ir a https://quieromesa.com/admin/modules"
  echo "   2. Activar el módulo 'Fianzas' en el plan que desees"
  echo "   3. Los restaurantes con ese plan podrán acceder a /restaurant/deposits"
else
  echo "❌ Error al agregar el módulo de fianzas"
  exit 1
fi
