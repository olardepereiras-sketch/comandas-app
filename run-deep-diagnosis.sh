#!/bin/bash

echo "🔍 Ejecutando diagnóstico profundo del sistema..."
echo "================================================"
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ejecutar diagnóstico
bun backend/db/diagnose-deep.ts

echo ""
echo "================================================"
echo "✅ Diagnóstico completado"
echo ""
echo "📋 INSTRUCCIONES:"
echo "  1. Copia TODO el output anterior"
echo "  2. Envíamelo completo para analizar"
echo "  3. NO omitas ninguna parte del diagnóstico"
echo ""
