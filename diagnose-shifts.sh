#!/bin/bash

echo "🔍 Ejecutando diagnóstico de carga de turnos..."

cd /var/www/reservamesa
bun backend/db/diagnose-shifts-loading.ts

echo ""
echo "✅ Diagnóstico completado"
