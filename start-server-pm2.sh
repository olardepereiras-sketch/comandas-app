#!/bin/bash

echo "🚀 Iniciando servidor ReservaMesa con PM2..."

pm2 delete reservamesa 2>/dev/null || true

pm2 start bun --name reservamesa -- --env-file .env backend/server.ts

pm2 save

echo "✅ Servidor iniciado con PM2"
echo "📊 Para ver logs: pm2 logs reservamesa"
echo "📊 Para ver estado: pm2 status"
echo "🛑 Para detener: pm2 stop reservamesa"
