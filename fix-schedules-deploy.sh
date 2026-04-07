#!/bin/bash

echo "🚀 Desplegando corrección de esquema de horarios..."

VPS_USER="root"
VPS_HOST="200.234.236.133"
VPS_DIR="/root/rork-app"

echo "📦 Subiendo archivos al VPS..."
scp backend/db/fix-schedules-schema.ts $VPS_USER@$VPS_HOST:$VPS_DIR/backend/db/

echo "🔧 Ejecutando migración en el VPS..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
cd /root/rork-app

echo "🔄 Compilando script de migración..."
bun backend/db/fix-schedules-schema.ts

echo "🔄 Reiniciando servidor..."
pm2 restart rork-app

echo "✅ Migración completada!"
ENDSSH

echo "🎉 Despliegue completado exitosamente!"
