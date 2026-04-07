#!/bin/bash

echo "🚀 Desplegando script de diagnóstico..."
echo "=========================================="

cd /var/www/reservamesa

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: No se encuentra package.json"
  exit 1
fi

echo "📦 1. Subiendo archivos de diagnóstico..."
# Los archivos ya están subidos con el script

echo "🔧 2. Haciendo ejecutable el script..."
chmod +x run-delete-cancel-diagnosis.sh

echo "🔍 3. Ejecutando diagnóstico..."
export $(cat .env | grep -v '^#' | xargs)
bun run backend/db/diagnose-delete-cancel.ts

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "📋 INSTRUCCIONES:"
echo "   1. Revisa los resultados del diagnóstico arriba"
echo "   2. Busca errores o permisos faltantes"
echo "   3. Si hay problemas de foreign keys, los solucionaremos"
echo "   4. Si hay problemas de permisos, ejecuta:"
echo "      GRANT ALL ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
echo ""
