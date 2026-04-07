#!/bin/bash

echo "🔧 Eliminando módulo duplicado de fianzas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar variables de entorno
if [ -f env ]; then
  export $(cat env | grep -v '^#' | xargs)
fi

echo "📋 Ejecutando script SQL..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f fix-deposits-duplicate.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Módulo duplicado eliminado exitosamente"
  echo ""
  echo "🔄 Reiniciando servidor..."
  pm2 restart quieromesa-backend
  echo "✅ Servidor reiniciado"
else
  echo ""
  echo "❌ Error al eliminar el módulo duplicado"
fi
