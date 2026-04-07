#!/bin/bash

echo "🔧 ARREGLANDO MÓDULOS - SOLUCIÓN COMPLETA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(grep -v '^#' env | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi
echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Ejecutando fix de módulos..."
bun backend/db/fix-modules-complete-final.ts

if [ $? -ne 0 ]; then
  echo "❌ Error arreglando módulos"
  exit 1
fi
echo "✅ Módulos arreglados"

echo ""
echo "📋 Paso 4: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 1
bun backend/server.ts > backend.log 2>&1 &
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ Error iniciando servidor"
  echo ""
  echo "Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MÓDULOS ARREGLADOS COMPLETAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Tu aplicación está lista en: https://quieromesa.com"
echo ""
echo "🔍 Para ver logs en tiempo real:"
echo "   tail -f backend.log"
echo ""
