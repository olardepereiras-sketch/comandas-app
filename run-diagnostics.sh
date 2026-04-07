#!/bin/bash

echo "🔍 Ejecutando diagnóstico completo..."
echo "==========================================="
echo ""

cd /var/www/reservamesa

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Ejecutar diagnóstico
bun backend/db/diagnose-issues.ts

echo ""
echo "==========================================="
echo "📊 Diagnóstico completado"
echo ""
echo "Por favor, copia TODA la salida y envíala"
echo "para poder identificar el problema."
