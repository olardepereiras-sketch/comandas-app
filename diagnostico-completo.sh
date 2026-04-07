#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA"
echo "===================================="
echo ""

# 1. Verificar qué bundle está sirviendo
echo "1️⃣ VERIFICANDO BUNDLE COMPILADO"
echo "--------------------------------"
ENTRY_FILE=$(ls -t dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -1)
if [ -n "$ENTRY_FILE" ]; then
  echo "✅ Bundle encontrado: $ENTRY_FILE"
  BUNDLE_SIZE=$(wc -c < "$ENTRY_FILE")
  BUNDLE_DATE=$(stat -c %y "$ENTRY_FILE" 2>/dev/null || stat -f "%Sm" "$ENTRY_FILE")
  echo "   Tamaño: $BUNDLE_SIZE bytes"
  echo "   Fecha: $BUNDLE_DATE"
  
  echo ""
  echo "🔍 Buscando funciones de BORRADO en el bundle:"
  
  # Buscar provincia delete
  if grep -q "deleteProvince" "$ENTRY_FILE"; then
    echo "   ✅ Tiene código 'deleteProvince'"
    # Contar cuántas veces aparece
    COUNT=$(grep -o "deleteProvince" "$ENTRY_FILE" | wc -l)
    echo "      Aparece $COUNT veces"
  else
    echo "   ❌ NO tiene código 'deleteProvince'"
  fi
  
  # Buscar city delete
  if grep -q "deleteCity" "$ENTRY_FILE"; then
    echo "   ✅ Tiene código 'deleteCity'"
  else
    echo "   ❌ NO tiene código 'deleteCity'"
  fi
  
  # Buscar cuisine delete
  if grep -q "cuisineTypes.delete" "$ENTRY_FILE" || grep -q "deleteMutation" "$ENTRY_FILE"; then
    echo "   ✅ Tiene código de borrado de cuisine types"
  else
    echo "   ❌ NO tiene código de borrado de cuisine types"
  fi
  
  # Buscar modifyByClient
  if grep -q "modifyByClient" "$ENTRY_FILE"; then
    echo "   ✅ Tiene código 'modifyByClient'"
    COUNT=$(grep -o "modifyByClient" "$ENTRY_FILE" | wc -l)
    echo "      Aparece $COUNT veces"
  else
    echo "   ❌ NO tiene código 'modifyByClient'"
  fi
  
else
  echo "❌ NO se encontró bundle compilado en dist/"
fi

echo ""
echo "2️⃣ VERIFICANDO CÓDIGO FUENTE"
echo "----------------------------"
echo "app/admin/locations.tsx:"
if [ -f "app/admin/locations.tsx" ]; then
  # Buscar la función handleDeleteProvince
  if grep -q "handleDeleteProvince\|deleteProvinceMutation" "app/admin/locations.tsx"; then
    echo "   ✅ Tiene función de borrado de provincia"
    echo "   Líneas relevantes:"
    grep -n "handleDeleteProvince\|deleteProvinceMutation.mutate" "app/admin/locations.tsx" | head -3
  else
    echo "   ❌ NO tiene función de borrado"
  fi
else
  echo "   ❌ Archivo no encontrado"
fi

echo ""
echo "app/admin/cuisine-types.tsx:"
if [ -f "app/admin/cuisine-types.tsx" ]; then
  if grep -q "handleDelete" "app/admin/cuisine-types.tsx"; then
    echo "   ✅ Tiene función handleDelete"
    LINE=$(grep -n "const handleDelete" "app/admin/cuisine-types.tsx" | cut -d: -f1)
    echo "   Función en línea: $LINE"
  else
    echo "   ❌ NO tiene función handleDelete"
  fi
else
  echo "   ❌ Archivo no encontrado"
fi

echo ""
echo "3️⃣ VERIFICANDO BACKEND"
echo "----------------------"
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  PID=$(pgrep -f "bun.*backend/server.ts")
  echo "✅ Backend corriendo (PID: $PID)"
  
  # Verificar que responda
  echo ""
  echo "Probando endpoint de backend:"
  RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health 2>/dev/null | tail -1)
  if [ "$RESPONSE" = "200" ] || [ -n "$RESPONSE" ]; then
    echo "   ✅ Backend responde"
  else
    echo "   ⚠️  Backend no responde correctamente"
  fi
else
  echo "❌ Backend NO está corriendo"
fi

echo ""
echo "4️⃣ VERIFICANDO NGINX"
echo "--------------------"
if systemctl is-active --quiet nginx; then
  echo "✅ Nginx está activo"
  
  # Verificar configuración de caché
  if [ -f "/etc/nginx/sites-available/reservamesa" ]; then
    echo ""
    echo "Configuración de caché en Nginx:"
    if grep -q "no-cache\|no-store" /etc/nginx/sites-available/reservamesa; then
      echo "   ✅ Configurado para NO cachear"
    else
      echo "   ⚠️  Podría estar cacheando"
    fi
  fi
else
  echo "❌ Nginx NO está activo"
fi

echo ""
echo "5️⃣ COMPARANDO HASHES"
echo "--------------------"
echo "Hash del código fuente:"
md5sum app/admin/locations.tsx 2>/dev/null | cut -d' ' -f1
md5sum app/admin/cuisine-types.tsx 2>/dev/null | cut -d' ' -f1
md5sum app/client/reservation/modify/[token].tsx 2>/dev/null | cut -d' ' -f1

echo ""
echo "6️⃣ VERIFICANDO LOGS DEL BACKEND"
echo "--------------------------------"
if [ -f "backend.log" ]; then
  echo "Últimas 10 líneas del log:"
  tail -10 backend.log
else
  echo "⚠️  No se encontró backend.log"
fi

echo ""
echo "======================================"
echo "📊 RESUMEN"
echo "======================================"
echo ""
echo "Para continuar el diagnóstico:"
echo "1. Ejecuta este script en el servidor: ./diagnostico-completo.sh"
echo "2. Abre el navegador en modo incógnito: https://quieromesa.com"
echo "3. Abre la consola del navegador (F12)"
echo "4. Intenta borrar una provincia y envía el error de la consola"
echo ""
