#!/bin/bash

echo "🔍 Ejecutando diagnóstico de turnos y plantillas..."
bun backend/db/diagnose-shifts-loading.ts
