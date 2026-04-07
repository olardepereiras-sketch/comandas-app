#!/bin/bash

echo "🔍 Ejecutando diagnóstico definitivo de horas disponibles..."
cd /var/www/reservamesa
bun backend/db/diagnose-available-hours-final.ts
