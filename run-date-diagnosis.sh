#!/bin/bash

echo "🔍 Ejecutando diagnóstico de fechas..."
echo ""

bun backend/db/diagnose-dates.ts

echo ""
echo "✅ Diagnóstico completado"
