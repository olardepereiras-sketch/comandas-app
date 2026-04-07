#!/bin/bash

echo "🔍 EJECUTANDO DIAGNÓSTICO DE TOKENS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /var/www/reservamesa

# Cargar variables de entorno
if [ -f "env" ]; then
    export $(grep -v '^#' env | xargs)
fi

# Ejecutar diagnóstico
bun backend/db/diagnose-tokens.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DIAGNÓSTICO COMPLETADO"
echo ""
echo "💡 Recomendaciones:"
echo "  1. Copia un token de confirmation_token"
echo "  2. Prueba acceder a: https://quieromesa.com/client/reservation/[TOKEN]"
echo "  3. Si aparece en blanco, revisa la consola del navegador (F12)"
echo ""
