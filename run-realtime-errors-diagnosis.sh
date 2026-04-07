#!/bin/bash

echo "🔍 Ejecutando diagnóstico de errores en tiempo real..."
cd /var/www/reservamesa
bun backend/db/diagnose-realtime-errors.ts
echo "✅ Diagnóstico completado"
