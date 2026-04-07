#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA REAL"
echo "=========================================="
echo ""

echo "PASO 1: Verificar archivos fuente"
echo "----------------------------------"

echo "✓ Verificando locations.tsx..."
if grep -q "const handleDelete = " app/admin/locations.tsx; then
  LINE=$(grep -n "const handleDelete = " app/admin/locations.tsx | cut -d: -f1)
  echo "  ✅ handleDelete existe en línea $LINE"
else
  echo "  ❌ handleDelete NO existe"
fi

echo ""
echo "✓ Verificando cuisine-types.tsx..."
if grep -q "const handleDelete = " app/admin/cuisine-types.tsx; then
  LINE=$(grep -n "const handleDelete = " app/admin/cuisine-types.tsx | cut -d: -f1)
  echo "  ✅ handleDelete existe en línea $LINE"
else
  echo "  ❌ handleDelete NO existe"
fi

echo ""
echo "✓ Verificando modify/[token].tsx..."
if grep -q "modifyMutation" app/client/reservation/modify/\[token\].tsx; then
  echo "  ✅ modifyMutation existe"
else
  echo "  ❌ modifyMutation NO existe"
fi

echo ""
echo "PASO 2: Verificar bundle compilado"
echo "-----------------------------------"

BUNDLE=$(ls -t dist/_expo/static/js/web/*.js 2>/dev/null | head -1)

if [ -z "$BUNDLE" ]; then
  echo "❌ No hay bundle compilado"
  echo ""
  echo "SOLUCIÓN:"
  echo "  chmod +x deploy-force-rebuild.sh"
  echo "  ./deploy-force-rebuild.sh"
  exit 1
fi

echo "✅ Bundle encontrado: $(basename $BUNDLE)"
echo "   Tamaño: $(du -h "$BUNDLE" | cut -f1)"
echo "   Fecha: $(stat -c %y "$BUNDLE")"

echo ""
echo "Verificando contenido del bundle..."

MISSING=""

if grep -q "handleDelete" "$BUNDLE"; then
  echo "  ✅ handleDelete está en el bundle"
else
  echo "  ❌ handleDelete NO está en el bundle"
  MISSING="yes"
fi

if grep -q "modifyMutation" "$BUNDLE"; then
  echo "  ✅ modifyMutation está en el bundle"
else
  echo "  ❌ modifyMutation NO está en el bundle"
  MISSING="yes"
fi

if [ ! -z "$MISSING" ]; then
  echo ""
  echo "⚠️  PROBLEMA ENCONTRADO: El código fuente existe pero NO se compiló en el bundle"
  echo ""
  echo "Esto puede ser por:"
  echo "  1. Caché corrupto de Metro Bundler"
  echo "  2. Tree-shaking agresivo"
  echo "  3. Error de compilación silencioso"
  echo ""
  echo "SOLUCIÓN:"
  echo "  chmod +x deploy-force-rebuild.sh"
  echo "  ./deploy-force-rebuild.sh"
  exit 1
fi

echo ""
echo "PASO 3: Verificar backend"
echo "-------------------------"

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  PID=$(pgrep -f "bun.*backend/server.ts")
  echo "✅ Backend corriendo (PID: $PID)"
else
  echo "❌ Backend NO está corriendo"
  echo ""
  echo "SOLUCIÓN:"
  echo "  cd /var/www/reservamesa"
  echo "  bun backend/server.ts > backend.log 2>&1 &"
  exit 1
fi

echo ""
echo "PASO 4: Verificar Nginx"
echo "-----------------------"

if systemctl is-active --quiet nginx; then
  echo "✅ Nginx corriendo"
  
  if grep -q "no-cache" /etc/nginx/sites-available/reservamesa; then
    echo "✅ Nginx configurado para NO cachear"
  else
    echo "⚠️  Nginx podría estar cacheando JS"
  fi
else
  echo "❌ Nginx NO está corriendo"
fi

echo ""
echo "=========================================="
echo "✅ DIAGNÓSTICO COMPLETADO"
echo ""
echo "TODO ESTÁ CORRECTO"
echo ""
echo "Si los botones aún no funcionan:"
echo "1. Abre el navegador en modo incógnito"
echo "2. O presiona Ctrl+Shift+Delete y borra caché"
echo "3. O presiona Ctrl+Shift+R para hard reload"
