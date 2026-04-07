#!/bin/bash

echo "🔧 Aplicando migración de reservas pendientes..."

cd /var/www/reservamesa

echo "📋 Ejecutando migración..."
bun run backend/db/add-pending-reservations-system.ts

if [ $? -eq 0 ]; then
    echo "✅ Migración ejecutada correctamente"
    
    echo "🔄 Reiniciando servidor..."
    pm2 restart reservamesa
    
    echo "✅ Sistema actualizado"
    echo ""
    echo "📊 Verificando columnas..."
    psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations' AND column_name IN ('pending_expires_at', 'is_new_client') ORDER BY column_name;"
else
    echo "❌ Error al ejecutar la migración"
    exit 1
fi
