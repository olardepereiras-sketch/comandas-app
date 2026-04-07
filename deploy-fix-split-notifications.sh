#!/bin/bash

echo "🔧 Corrigiendo sistema de notificaciones en división de mesas..."

cd /var/www/reservamesa

echo "📦 Instalando dependencias..."
bun install

echo "🏗️ Construyendo proyecto..."
bun run build

echo "🔄 Reiniciando servicios..."
pm2 restart all

echo "✅ Corrección aplicada exitosamente"
echo "📋 Las notificaciones al cliente ahora se enviarán correctamente cuando se divide una mesa"
