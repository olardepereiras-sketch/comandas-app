#!/bin/bash

set -e

echo "🚀 QUIEROMESA - ACTUALIZACIÓN 2.1"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f ".env" ]; then
    echo "❌ Error: Archivo .env no encontrado"
    exit 1
fi

source .env

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no configurada en .env"
    exit 1
fi

echo "📋 Paso 1: Migrando base de datos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun backend/db/add-pending-reservations-system.ts
echo "✅ Base de datos migrada"
echo ""

echo "📋 Paso 2: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install
echo "✅ Dependencias instaladas"
echo ""

echo "📋 Paso 3: Compilando frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend compilado"
echo ""

echo "📋 Paso 4: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pkill -f 'bun.*backend/server.ts' || true
sleep 2
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor reiniciado"
echo ""

echo "📋 Paso 5: Verificando estado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
    echo "✅ Servidor ejecutándose correctamente"
else
    echo "❌ Error: El servidor no está corriendo"
    exit 1
fi

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Endpoint de salud respondiendo"
else
    echo "⚠️  Advertencia: Endpoint de salud no responde"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ACTUALIZACIÓN 2.1 COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 NUEVAS FUNCIONALIDADES:"
echo "  ✅ Sistema de confirmación pendiente unificado"
echo "  ✅ Reservas con asignación temporal de mesas (5 minutos)"
echo "  ✅ Auto-liberación de mesas después de 5 minutos"
echo "  ✅ Reasignación inteligente de mesas"
echo "  ✅ Registro de clientes solo al confirmar"
echo "  ✅ Mismas rutas para cliente (/client/restaurant y /client/restaurant2)"
echo ""
echo "📝 Logs: tail -f backend.log"
echo ""
