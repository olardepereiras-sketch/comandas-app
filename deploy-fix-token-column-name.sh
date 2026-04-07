#!/bin/bash

echo "🚀 Desplegando corrección de nombre de columna en get-by-token2..."

cd /var/www/reservamesa || exit 1

echo "📦 Instalando dependencias si es necesario..."
bun install

echo "🔨 Compilando TypeScript..."
bun run build

echo "🔄 Reiniciando servidor..."
pm2 restart backend

echo "⏳ Esperando a que el servidor esté listo..."
sleep 5

echo "✅ Corrección desplegada exitosamente!"
echo ""
echo "Prueba accediendo al token para verificar que funciona correctamente."
