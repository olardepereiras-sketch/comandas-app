#!/bin/bash

echo "🚀 Desplegando aceptación de términos y condiciones..."

# Subir archivos al servidor
echo "📤 Subiendo archivos..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.expo' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.cache' \
  --exclude 'bun.lock' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'logs/' \
  --exclude '.vscode' \
  --exclude '.idea' \
  ./ root@45.76.48.96:/root/reservamesa/

# Ejecutar en el servidor
ssh root@45.76.48.96 << 'ENDSSH'
cd /root/reservamesa

echo "🔄 Ejecutando migración de base de datos..."
bun run backend/db/add-terms-acceptance.ts

echo "📦 Instalando dependencias..."
bun install

echo "🏗️ Construyendo frontend..."
bun run build:web

echo "♻️ Reiniciando servidor..."
pm2 restart reservamesa-backend

echo "✅ Despliegue completado"
ENDSSH

echo "🎉 Despliegue de términos y condiciones completado"
