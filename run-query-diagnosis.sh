#!/bin/bash

echo "🔍 Ejecutando diagnóstico de queries..."
echo "==========================================="
echo ""

cd /var/www/reservamesa
bun run backend/db/diagnose-queries.ts

echo ""
echo "==========================================="
echo "✅ Diagnóstico completado"
echo ""
echo "📋 Por favor envía TODO el output"
