#!/bin/bash

echo "🔧 Ejecutando migración para funcionalidades de agrupar y dividir mesas..."

# Verificar si existe el archivo de migración
if [ ! -f "backend/migrations/add-table-grouping-splitting.sql" ]; then
    echo "❌ Error: No se encuentra el archivo de migración"
    exit 1
fi

# Ejecutar la migración usando las credenciales del VPS
echo "📊 Aplicando cambios a la base de datos..."
PGPASSWORD='MiContrasenaSegura666' psql -U reservamesa_user -d reservamesa_db -h localhost -f backend/migrations/add-table-grouping-splitting.sql

if [ $? -eq 0 ]; then
    echo "✅ Migración completada exitosamente"
    echo ""
    echo "📋 Cambios aplicados:"
    echo "  ✓ Agregadas columnas para mesas temporales"
    echo "  ✓ Agregadas columnas para grupos temporales"
    echo "  ✓ Creada tabla table_modifications"
    echo "  ✓ Creados índices para mejorar rendimiento"
    echo ""
    echo "🔄 Reiniciando servidor..."
    pm2 restart reservamesa-backend
    echo "✅ Servidor reiniciado"
else
    echo "❌ Error al ejecutar la migración"
    exit 1
fi
