#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 SOLUCION COMPLETA - PANTALLA EN BLANCO DEL TOKEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "1️⃣ Instalando configuración de nginx..."
if [ -f "/var/www/reservamesa/nginx-quieromesa.conf" ]; then
    sudo cp /var/www/reservamesa/nginx-quieromesa.conf /etc/nginx/sites-available/quieromesa.conf
    sudo ln -sf /etc/nginx/sites-available/quieromesa.conf /etc/nginx/sites-enabled/
    echo "✅ Configuración de nginx instalada"
else
    echo "❌ Error: No se encuentra nginx-quieromesa.conf"
    exit 1
fi

echo ""
echo "2️⃣ Verificando configuración de nginx..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Error en la configuración de nginx"
    exit 1
fi

echo ""
echo "3️⃣ Recargando nginx..."
sudo systemctl reload nginx
echo "✅ nginx recargado"

echo ""
echo "4️⃣ Deteniendo procesos anteriores..."
pkill -f "bunx rork start.*--web" || true
pkill -f "bun.*server.ts" || true
sleep 3
pkill -9 -f chrome || true
pkill -9 -f chromium || true
sleep 2

echo ""
echo "5️⃣ Limpiando cache..."
rm -rf .expo node_modules/.cache

echo ""
echo "6️⃣ Iniciando backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"

echo ""
echo "7️⃣ Esperando que el backend inicie..."
sleep 10

echo ""
echo "8️⃣ Iniciando servidor web de Expo..."
nohup bun run start-web > web-server.log 2>&1 &
WEB_PID=$!
echo "✅ Servidor web iniciado (PID: $WEB_PID)"

echo ""
echo "9️⃣ Esperando que el servidor web inicie..."
sleep 20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA INICIADO COMPLETAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Verificar logs:"
echo "   Backend:     tail -f /var/www/reservamesa/backend.log"
echo "   Servidor web: tail -f /var/www/reservamesa/web-server.log"
echo "   nginx:       tail -f /var/log/nginx/quieromesa-error.log"
echo ""
echo "🌐 URLs:"
echo "   Frontend: https://quieromesa.com"
echo "   Backend:  https://quieromesa.com/api/health"
echo ""
echo "🧪 Probar token de reserva:"
echo "   Crear una reserva y hacer clic en el enlace del WhatsApp"
echo ""
