#!/bin/bash

echo "🕐 CREANDO HORAS DISPONIBLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi

echo ""
echo "📋 Paso 2: Creando horas..."
bun backend/db/create-time-slots.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ HORAS CREADAS EXITOSAMENTE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Horas disponibles:"
    echo "  12:00 - 00:00 (intervalos de 30 min)"
else
    echo ""
    echo "❌ Error creando horas"
    exit 1
fi
