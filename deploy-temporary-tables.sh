#!/bin/bash

echo "🔧 Desplegando sistema de mesas temporales..."

if [ ! -f ".env" ] && [ ! -f "env" ]; then
    echo "❌ Archivo de variables de entorno no encontrado"
    exit 1
fi

if [ -f "env" ]; then
    export $(grep -v '^#' env | xargs)
elif [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "📊 Creando tabla de mesas temporales..."
bun run backend/db/add-temporary-tables.ts

echo "🔄 Reiniciando servidor..."
pm2 restart reservamesa || pm2 start ecosystem.config.js

echo "✅ Sistema de mesas temporales desplegado correctamente"
