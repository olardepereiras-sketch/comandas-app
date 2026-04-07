#!/bin/bash
echo "🔍 Ejecutando diagnóstico de desfase de fechas..."
cd /var/www/reservamesa
bun backend/db/diagnose-date-offset.ts
echo "✅ Diagnóstico completado"
