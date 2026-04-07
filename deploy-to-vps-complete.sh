#!/bin/bash

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 COPIANDO PROYECTO COMPLETO A /var/www/reservamesa"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Copiar directorio app completo
echo "📁 Copiando directorio app/..."
sudo rm -rf /var/www/reservamesa/app
sudo cp -r app /var/www/reservamesa/
sudo chown -R root:root /var/www/reservamesa/app

# Verificar que el archivo existe
if [ -f "/var/www/reservamesa/app/client/reservation2/[token2].tsx" ]; then
    echo "✅ Archivo [token2].tsx copiado correctamente"
else
    echo "❌ ERROR: Archivo [token2].tsx NO se copió"
    exit 1
fi

# Copiar backend
echo "📁 Copiando directorio backend/..."
sudo cp -r backend /var/www/reservamesa/
sudo chown -R root:root /var/www/reservamesa/backend

# Copiar otros archivos necesarios
echo "📁 Copiando archivos de configuración..."
sudo cp package.json /var/www/reservamesa/
sudo cp tsconfig.json /var/www/reservamesa/
sudo cp metro.config.js /var/www/reservamesa/
sudo cp babel.config.js /var/www/reservamesa/
sudo cp app.json /var/www/reservamesa/
sudo cp -r lib /var/www/reservamesa/ 2>/dev/null || true
sudo cp -r types /var/www/reservamesa/ 2>/dev/null || true
sudo cp -r constants /var/www/reservamesa/ 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 RECONSTRUYENDO FRONTEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

# Limpiar build anterior
sudo rm -rf dist .expo

# Construir frontend
echo "📦 Ejecutando: npx expo export --platform web"
sudo npx expo export --platform web --output-dir dist

if [ -f "dist/index.html" ]; then
    echo "✅ Frontend construido exitosamente"
else
    echo "❌ ERROR: No se generó dist/index.html"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 REINICIANDO SERVIDOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Matar procesos
sudo pkill -f "bun.*server.ts" || true
sleep 2
sudo pkill -f chrome || true
sudo pkill -f chromium || true
sleep 1

# Iniciar servidor
cd /var/www/reservamesa
sudo nohup bun backend/server.ts > backend.log 2>&1 &

echo "⏳ Esperando 5 segundos para que inicie el servidor..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETO FINALIZADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Últimas líneas del log:"
tail -30 /var/www/reservamesa/backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR CORRIENDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ahora puedes:"
echo "  1. Crear una nueva reserva"
echo "  2. Hacer clic en el enlace del token"
echo "  3. Confirmar la reserva"
echo ""
echo "Para ver logs en tiempo real:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
