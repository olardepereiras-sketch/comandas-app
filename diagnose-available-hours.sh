#!/bin/bash

echo "🔍 Ejecutando diagnóstico de horas disponibles..."
echo ""

cd /var/www/reservamesa
bun backend/db/diagnose-available-hours.ts

echo ""
echo "✅ Diagnóstico completado"
