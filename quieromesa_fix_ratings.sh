#!/bin/bash

set -e

echo "🚀 QUIEROMESA - Actualización Sistema de Valoraciones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Paso 1: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install
echo "✅ Dependencias instaladas"
echo ""

echo "📋 Paso 2: Compilando aplicación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx expo export --platform web --output-dir dist
echo "✅ Aplicación compilada"
echo ""

echo "📋 Paso 3: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 restart reservamesa || pm2 start bun --name reservamesa -- run backend/server.ts
echo "✅ Servidor reiniciado"
echo ""

echo "✅ Actualización completada exitosamente"
echo ""
echo "📝 Cambios aplicados:"
echo "  • Corregidos botones de eliminar criterios y reglas"
echo "  • Sistema de valoración calcula media de todos los criterios"
echo "  • Nota global del cliente se actualiza con histórico completo"
echo ""
