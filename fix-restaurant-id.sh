#!/bin/bash

echo "🔧 Corrigiendo ID del restaurante..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Credenciales de PostgreSQL desde DATABASE_URL
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"
DB_HOST="localhost"
DB_NAME="reservamesa_db"

# Ejecutar el script SQL
echo "📋 Ejecutando corrección de ID..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f fix-restaurant-id.sql

if [ $? -eq 0 ]; then
    echo "✅ ID del restaurante corregido exitosamente"
    echo ""
    echo "🔄 Reiniciando servidor..."
    pm2 restart quieromesa-backend
    echo "✅ Servidor reiniciado"
else
    echo "❌ Error al corregir el ID del restaurante"
    exit 1
fi
