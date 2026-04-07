#!/bin/bash

echo "🚀 Desplegando sistema de fianzas con Stripe..."

cd backend

echo "📦 Instalando dependencias..."
bun install

echo "🗄️ Ejecutando migración de base de datos..."
bun run db/run-add-deposits-migration.ts

if [ $? -eq 0 ]; then
    echo "✅ Migración completada exitosamente"
    
    echo "🔄 Reiniciando servidor..."
    cd ..
    pm2 restart all || bun run server.ts
    
    echo "✅ Sistema de fianzas desplegado correctamente"
else
    echo "❌ Error en la migración de base de datos"
    exit 1
fi
