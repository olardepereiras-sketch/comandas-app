#!/bin/bash

echo "🚀 Desplegando sistema de criterios de valoración..."

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ejecutar migración
echo "📋 Ejecutando migración de base de datos..."
bun backend/db/run-rating-criteria-migration.ts

# Reiniciar servidor
echo "🔄 Reiniciando servidor..."
pm2 restart reservamesa

echo "✅ Despliegue completado!"
