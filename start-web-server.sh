#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 INICIANDO SERVIDOR WEB EXPO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

# Matar proceso web anterior si existe
echo "🔄 Deteniendo servidor web anterior..."
pkill -f "bunx rork start.*--web" || true
sleep 2

# Limpiar cache
echo "🧹 Limpiando cache..."
rm -rf .expo node_modules/.cache

# Iniciar servidor web en background
echo "🚀 Iniciando servidor web..."
nohup bun run start-web > web-server.log 2>&1 &

echo "⏳ Esperando 15 segundos para que el servidor inicie..."
sleep 15

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR WEB INICIADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs:"
echo "  tail -f /var/www/reservamesa/web-server.log"
echo ""
