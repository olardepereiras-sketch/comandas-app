#!/bin/bash

echo "🔍 DIAGNÓSTICO EXHAUSTIVO DEL PROBLEMA REAL"
echo "==========================================="
echo ""

echo "PASO 1: Verificar código fuente actual"
echo "--------------------------------------"
echo "✓ Verificando locations.tsx..."
if grep -q "const handleDelete" app/admin/locations.tsx; then
  LINE=$(grep -n "const handleDelete" app/admin/locations.tsx | cut -d: -f1)
  echo "  ✅ handleDelete existe en línea $LINE"
  
  # Extraer las primeras líneas de la función
  echo ""
  echo "  📄 Código de handleDelete:"
  sed -n "${LINE},$((LINE+15))p" app/admin/locations.tsx | head -15
else
  echo "  ❌ NO existe handleDelete"
fi

echo ""
echo "✓ Verificando cuisine-types.tsx..."
if grep -q "const handleDelete" app/admin/cuisine-types.tsx; then
  LINE=$(grep -n "const handleDelete" app/admin/cuisine-types.tsx | cut -d: -f1)
  echo "  ✅ handleDelete existe en línea $LINE"
else
  echo "  ❌ NO existe handleDelete"
fi

echo ""
echo "✓ Verificando modify/[token].tsx..."
if grep -q "modifyMutation" app/client/reservation/modify/[token].tsx; then
  echo "  ✅ modifyMutation existe"
  # Verificar si tiene el reload de la página
  if grep -q "window.location.href" app/client/reservation/modify/[token].tsx; then
    echo "  ✅ Tiene reload de página"
  else
    echo "  ⚠️  NO tiene reload de página"
  fi
else
  echo "  ❌ NO existe modifyMutation"
fi

echo ""
echo ""
echo "PASO 2: Verificar bundle compilado"
echo "-----------------------------------"
ENTRY_FILE=$(ls -t dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -1)

if [ -z "$ENTRY_FILE" ]; then
  echo "❌ NO existe bundle compilado en dist/"
  echo ""
  echo "SOLUCIÓN: El problema es que no hay bundle compilado"
  echo "Ejecuta: bunx expo export -p web"
  exit 1
fi

echo "✅ Bundle encontrado: $(basename $ENTRY_FILE)"
echo "   Tamaño: $(du -h $ENTRY_FILE | cut -f1)"
echo "   Fecha: $(stat -c %y $ENTRY_FILE 2>/dev/null || stat -f "%Sm" $ENTRY_FILE 2>/dev/null)"

echo ""
echo "Verificando contenido del bundle..."

# Verificar handleDelete
if grep -q "handleDelete" "$ENTRY_FILE"; then
  COUNT=$(grep -o "handleDelete" "$ENTRY_FILE" | wc -l)
  echo "  ✅ Contiene 'handleDelete' ($COUNT veces)"
else
  echo "  ❌ NO contiene 'handleDelete'"
  echo ""
  echo "⚠️  PROBLEMA ENCONTRADO: El bundle NO tiene el código de handleDelete"
  echo "Esto significa que el código fuente NO se está compilando correctamente"
  echo ""
  echo "SOLUCIÓN:"
  echo "1. Borra dist/: rm -rf dist/"
  echo "2. Compila de nuevo: bunx expo export -p web --clear"
  exit 1
fi

# Verificar deleteProvince
if grep -q "deleteProvince" "$ENTRY_FILE"; then
  COUNT=$(grep -o "deleteProvince" "$ENTRY_FILE" | wc -l)
  echo "  ✅ Contiene 'deleteProvince' ($COUNT veces)"
else
  echo "  ❌ NO contiene 'deleteProvince'"
fi

# Verificar modifyByClient
if grep -q "modifyByClient" "$ENTRY_FILE"; then
  COUNT=$(grep -o "modifyByClient" "$ENTRY_FILE" | wc -l)
  echo "  ✅ Contiene 'modifyByClient' ($COUNT veces)"
else
  echo "  ❌ NO contiene 'modifyByClient'"
fi

# Verificar Alert de confirmación
if grep -q "Eliminar Provincia" "$ENTRY_FILE"; then
  echo "  ✅ Contiene Alert 'Eliminar Provincia'"
else
  echo "  ❌ NO contiene Alert 'Eliminar Provincia'"
  echo ""
  echo "⚠️  PROBLEMA: El bundle NO tiene el texto del Alert"
  echo "Esto indica que se está sirviendo un bundle viejo"
fi

echo ""
echo ""
echo "PASO 3: Verificar qué está sirviendo Nginx"
echo "-------------------------------------------"
if [ -f "dist/index.html" ]; then
  BUNDLE_NAME=$(grep -o 'entry-[^"]*\.js' dist/index.html | head -1)
  echo "✅ index.html carga: $BUNDLE_NAME"
  
  # Verificar que el archivo exista
  if [ -f "dist/_expo/static/js/web/$BUNDLE_NAME" ]; then
    echo "  ✅ El archivo existe"
  else
    echo "  ❌ El archivo NO existe"
    echo ""
    echo "⚠️  PROBLEMA CRÍTICO: index.html referencia un bundle que no existe"
  fi
else
  echo "❌ NO existe dist/index.html"
fi

echo ""
echo ""
echo "PASO 4: Verificar backend"
echo "-------------------------"
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  PID=$(pgrep -f "bun.*backend/server.ts")
  echo "✅ Backend corriendo (PID: $PID)"
  
  # Ver logs recientes
  if [ -f "backend.log" ]; then
    echo ""
    echo "Últimas 5 líneas del log:"
    tail -5 backend.log
  fi
else
  echo "❌ Backend NO está corriendo"
  echo ""
  echo "⚠️  PROBLEMA: El backend debe estar corriendo"
  echo "SOLUCIÓN: bun backend/server.ts > backend.log 2>&1 &"
  exit 1
fi

echo ""
echo ""
echo "======================================"
echo "📊 CONCLUSIÓN DEL DIAGNÓSTICO"
echo "======================================"
echo ""

# Determinar cuál es el problema real
HAS_SOURCE_CODE=false
HAS_BUNDLE_CODE=false
BACKEND_RUNNING=false

if grep -q "const handleDelete" app/admin/locations.tsx; then
  HAS_SOURCE_CODE=true
fi

if [ -n "$ENTRY_FILE" ] && grep -q "handleDelete" "$ENTRY_FILE"; then
  HAS_BUNDLE_CODE=true
fi

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  BACKEND_RUNNING=true
fi

if [ "$HAS_SOURCE_CODE" = true ] && [ "$HAS_BUNDLE_CODE" = true ] && [ "$BACKEND_RUNNING" = true ]; then
  echo "✅ CÓDIGO FUENTE: Correcto"
  echo "✅ BUNDLE COMPILADO: Correcto"
  echo "✅ BACKEND: Corriendo"
  echo ""
  echo "🔍 EL PROBLEMA ES EL NAVEGADOR"
  echo "================================"
  echo ""
  echo "El código está bien, pero el navegador está cacheando."
  echo ""
  echo "SOLUCIÓN DEFINITIVA:"
  echo "1. En el servidor, ejecuta:"
  echo "   chmod +x solucion-definitiva-bundle.sh"
  echo "   ./solucion-definitiva-bundle.sh"
  echo ""
  echo "2. En tu computadora:"
  echo "   • Abre Chrome"
  echo "   • Presiona Ctrl+Shift+Delete (Cmd+Shift+Delete en Mac)"
  echo "   • Selecciona 'Todo el tiempo'"
  echo "   • Marca 'Imágenes y archivos en caché'"
  echo "   • Click en 'Borrar datos'"
  echo "   • Cierra Chrome COMPLETAMENTE"
  echo "   • Abre Chrome de nuevo"
  echo "   • Ve a https://quieromesa.com en modo incógnito (Ctrl+Shift+N)"
  echo ""
else
  echo "⚠️  PROBLEMAS ENCONTRADOS:"
  if [ "$HAS_SOURCE_CODE" = false ]; then
    echo "  ❌ Código fuente incorrecto"
  fi
  if [ "$HAS_BUNDLE_CODE" = false ]; then
    echo "  ❌ Bundle no contiene el código"
  fi
  if [ "$BACKEND_RUNNING" = false ]; then
    echo "  ❌ Backend no está corriendo"
  fi
  echo ""
  echo "SOLUCIÓN:"
  echo "chmod +x solucion-definitiva-bundle.sh"
  echo "./solucion-definitiva-bundle.sh"
fi

echo ""
echo "======================================"
