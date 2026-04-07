#!/bin/bash

echo "🚀 Desplegando sistema de reglas de No Shows..."
echo "========================================"

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "📋 1. Creando tablas de no shows..."
echo "------------------------------------------------------------"
bun run backend/db/add-no-show-rules.ts

if [ $? -eq 0 ]; then
    echo "✅ Tablas creadas correctamente"
else
    echo "❌ Error creando tablas"
    exit 1
fi

echo ""
echo "📦 2. Reiniciando servidor con PM2..."
echo "------------------------------------------------------------"
pm2 restart reservamesa-server

if [ $? -eq 0 ]; then
    echo "✅ Servidor reiniciado correctamente"
else
    echo "❌ Error reiniciando servidor"
    exit 1
fi

echo ""
echo "🎉 ¡Despliegue completado con éxito!"
echo "========================================"
echo ""
echo "✅ Sistema de reglas de No Shows implementado"
echo ""
echo "📍 Accede a:"
echo "   - http://200.234.236.133/admin/rating-criteria - Configurar reglas de No Shows"
echo "   - http://200.234.236.133/admin/users - Gestionar usuarios y sus No Shows"
echo ""
