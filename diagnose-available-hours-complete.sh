#!/bin/bash

echo "🔍 Ejecutando diagnóstico completo de horas disponibles..."
echo ""

cd /var/www/reservamesa
bun backend/db/diagnose-available-hours-complete.ts
