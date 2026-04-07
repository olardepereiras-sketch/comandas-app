#!/bin/bash

cd /var/www/reservamesa

export $(cat .env | grep -v '^#' | xargs)

echo "🔍 Ejecutando diagnóstico de borrado y cancelación..."
echo "=========================================="

bun run backend/db/diagnose-delete-cancel.ts

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "📝 Revisa los resultados arriba para identificar el problema"
