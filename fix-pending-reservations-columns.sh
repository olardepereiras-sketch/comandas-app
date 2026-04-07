#!/bin/bash

echo "🚀 Agregando columnas faltantes para reservas pendientes..."

cd /var/www/reservamesa

echo "📦 Ejecutando migración..."
bun run backend/db/add-pending-reservation-columns.ts

if [ $? -eq 0 ]; then
  echo "✅ Migración completada"
  
  echo "🔄 Reiniciando servidor..."
  pm2 restart reservamesa
  
  echo "✅ ¡Listo! Las reservas ahora deberían funcionar correctamente"
else
  echo "❌ Error en la migración"
  exit 1
fi
