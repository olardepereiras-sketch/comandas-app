#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA DEL SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Deteniendo procesos..."
pkill -f "bun.*backend/server.ts" || true
echo "✅ Procesos detenidos"

echo ""
echo "📋 Paso 2: Cargando variables de entorno desde archivo env..."
if [ -f "env" ]; then
  set -a
  source env
  set +a
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

echo ""
echo "📋 Paso 3: Verificando variables críticas..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi
echo "   ✓ DATABASE_URL: configurada"

if [ -z "$RESEND_API_KEY" ]; then
  echo "   ⚠️  RESEND_API_KEY no configurada (emails no funcionarán)"
else
  echo "   ✓ RESEND_API_KEY: configurada"
fi

echo ""
echo "📋 Paso 4: Arreglando esquema de base de datos..."
bun backend/db/fix-all-schema-issues.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando esquema"
  exit 1
fi
echo "✅ Esquema arreglado"

echo ""
echo "📋 Paso 5: Limpiando y reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 6: Iniciando servidor con variables de entorno..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado (PID: $SERVER_PID)"

echo ""
echo "📋 Paso 7: Esperando que el servidor arranque..."
sleep 3

echo ""
echo "📋 Paso 8: Verificando que el servidor está corriendo..."
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo correctamente"
else
  echo "❌ El servidor se detuvo. Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "📋 Paso 9: Verificando puerto 3000..."
if lsof -i:3000 > /dev/null 2>&1; then
  echo "✅ Puerto 3000 en uso por el servidor"
else
  echo "⚠️  Puerto 3000 no está en uso aún, el servidor podría estar iniciándose..."
fi

echo ""
echo "📋 Paso 10: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA ARREGLADO Y EN FUNCIONAMIENTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Información:"
echo "   Servidor PID: $SERVER_PID"
echo "   Puerto: 3000"
echo ""
echo "🔍 Para ver logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🌐 Tu aplicación está disponible en:"
echo "   https://quieromesa.com"
echo ""
