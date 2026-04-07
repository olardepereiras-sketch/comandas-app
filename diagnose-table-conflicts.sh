#!/bin/bash

echo "🔍 Ejecutando diagnóstico de conflictos de mesas..."
echo ""

cd /var/www/reservamesa

# Cargar variables de entorno
source .env

# Ejecutar diagnóstico
bun run backend/db/diagnose-table-conflicts.ts

echo ""
echo "✅ Diagnóstico completado"
