#!/bin/bash

echo "🔍 Ejecutando diagnóstico en tiempo real..."
cd /var/www/reservamesa
bun backend/db/diagnose-realtime.ts

echo ""
echo "✅ Diagnóstico completado"
