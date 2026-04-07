#!/bin/bash

echo "🔍 VERIFICANDO CONTENIDO DEL BUNDLE"
echo "===================================="
echo ""

BUNDLE=$(ls -t dist/_expo/static/js/web/*.js 2>/dev/null | head -1)

if [ -z "$BUNDLE" ]; then
  echo "❌ No se encontró el bundle"
  echo "Ejecuta primero: bunx expo export -p web"
  exit 1
fi

echo "📄 Bundle: $BUNDLE"
echo "📊 Tamaño: $(du -h "$BUNDLE" | cut -f1)"
echo ""

echo "🔎 Buscando funciones críticas..."
echo ""

if grep -q "handleDelete" "$BUNDLE"; then
  COUNT=$(grep -o "handleDelete" "$BUNDLE" | wc -l)
  echo "✅ handleDelete encontrado ($COUNT veces)"
else
  echo "❌ handleDelete NO encontrado"
fi

if grep -q "modifyMutation" "$BUNDLE"; then
  COUNT=$(grep -o "modifyMutation" "$BUNDLE" | wc -l)
  echo "✅ modifyMutation encontrado ($COUNT veces)"
else
  echo "❌ modifyMutation NO encontrado"
fi

if grep -q "deleteProvinceMutation" "$BUNDLE"; then
  COUNT=$(grep -o "deleteProvinceMutation" "$BUNDLE" | wc -l)
  echo "✅ deleteProvinceMutation encontrado ($COUNT veces)"
else
  echo "❌ deleteProvinceMutation NO encontrado"
fi

if grep -q "deleteCityMutation" "$BUNDLE"; then
  COUNT=$(grep -o "deleteCityMutation" "$BUNDLE" | wc -l)
  echo "✅ deleteCityMutation encontrado ($COUNT veces)"
else
  echo "❌ deleteCityMutation NO encontrado"
fi

if grep -q "deleteMutation" "$BUNDLE"; then
  COUNT=$(grep -o "deleteMutation" "$BUNDLE" | wc -l)
  echo "✅ deleteMutation encontrado ($COUNT veces)"
else
  echo "❌ deleteMutation NO encontrado"
fi

echo ""
echo "🔎 Buscando strings de confirmación..."
echo ""

if grep -q "Eliminar Provincia" "$BUNDLE"; then
  echo "✅ 'Eliminar Provincia' encontrado"
else
  echo "❌ 'Eliminar Provincia' NO encontrado"
fi

if grep -q "Eliminar Población" "$BUNDLE"; then
  echo "✅ 'Eliminar Población' encontrado"
else
  echo "❌ 'Eliminar Población' NO encontrado"
fi

if grep -q "Eliminar Tipo de Cocina" "$BUNDLE"; then
  echo "✅ 'Eliminar Tipo de Cocina' encontrado"
else
  echo "❌ 'Eliminar Tipo de Cocina' NO encontrado"
fi

echo ""
echo "📊 Resumen:"
if grep -q "handleDelete" "$BUNDLE" && grep -q "modifyMutation" "$BUNDLE"; then
  echo "✅ El bundle parece correcto"
else
  echo "❌ El bundle tiene problemas - el código NO se está compilando"
  echo ""
  echo "Soluciones:"
  echo "1. Ejecuta: rm -rf .expo/ dist/ && bunx expo export -p web --clear"
  echo "2. Verifica que no haya errores de TypeScript: bunx tsc --noEmit"
  echo "3. Verifica que los archivos fuente tengan el código"
fi
