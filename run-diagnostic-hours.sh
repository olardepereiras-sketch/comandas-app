#!/bin/bash

echo "🔍 Ejecutando diagnóstico de horas disponibles..."
echo ""

cd /var/www/reservamesa
bun run backend/scripts/diagnose-available-hours-issue.ts

echo ""
echo "✅ Diagnóstico completado"
