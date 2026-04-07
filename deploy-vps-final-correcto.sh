#!/bin/bash

echo "🚀 DEPLOY DEFINITIVO - RESERVAMESA"
echo "===================================="

cd /var/www/reservamesa || exit 1

# PASO 1: Detener servicios
echo "📋 PASO 1: Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true

# PASO 2: Limpiar
echo "📋 PASO 2: Limpiando caches..."
rm -rf .expo node_modules/.cache dist

# PASO 3: Verificar estructura
echo "📋 PASO 3: Verificando archivos..."
if [ ! -f "lib/trpc.ts" ]; then
    echo "❌ ERROR: Falta lib/trpc.ts"
    exit 1
fi

if [ ! -f "types/index.ts" ]; then
    echo "❌ ERROR: Falta types/index.ts"
    exit 1
fi

if [ ! -f "constants/colors.ts" ]; then
    echo "❌ ERROR: Falta constants/colors.ts"
    exit 1
fi

echo "✅ Archivos necesarios encontrados"

# PASO 4: Restaurar imports originales con @/
echo "📋 PASO 4: Restaurando imports originales..."
find app -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
    -e 's|from "\.\./lib/trpc"|from "@/lib/trpc"|g' \
    -e 's|from "\./lib/trpc"|from "@/lib/trpc"|g' \
    -e 's|from "../../lib/trpc"|from "@/lib/trpc"|g' \
    -e 's|from "../../../lib/trpc"|from "@/lib/trpc"|g' \
    -e 's|from "\.\./types"|from "@/types"|g' \
    -e 's|from "\./types"|from "@/types"|g' \
    -e 's|from "../../types"|from "@/types"|g' \
    -e 's|from "\.\./constants/colors"|from "@/constants/colors"|g' \
    -e 's|from "\./constants/colors"|from "@/constants/colors"|g' \
    -e 's|from "../../constants/colors"|from "@/constants/colors"|g' \
    {} \;

echo "✅ Imports restaurados"

# PASO 5: Crear metro.config.js correcto
echo "📋 PASO 5: Configurando Metro..."
cat > metro.config.js << 'METRO_EOF'
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  alias: {
    '@': __dirname,
  },
};

module.exports = config;
METRO_EOF

echo "✅ Metro configurado"

# PASO 6: Instalar dependencias
echo "📋 PASO 6: Instalando dependencias..."
bun install --frozen-lockfile 2>/dev/null || bun install

# PASO 7: Export
echo "📋 PASO 7: Exportando frontend (puede tardar 2-3 minutos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
    echo "❌ ERROR: No se generó dist/"
    exit 1
fi

echo "✅ Frontend exportado"

# PASO 8: Iniciar backend
echo "📋 PASO 8: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# PASO 9: Health check
if curl -f http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend funcionando (PID: $BACKEND_PID)"
else
    echo "⚠️  Backend iniciado pero health check falló (PID: $BACKEND_PID)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL: http://200.234.236.133"
echo "📊 Logs: tail -f /var/www/reservamesa/backend.log"
echo ""
