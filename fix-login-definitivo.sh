#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Login y HTTPS"
echo "======================================"
echo ""

# 1. Detener servicios
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*server.ts" 2>/dev/null
pkill -f "node.*server" 2>/dev/null
sudo systemctl stop nginx 2>/dev/null

# 2. Limpiar todo
echo "🗑️  2. Limpiando caché..."
rm -rf .expo/
rm -rf dist/
rm -rf node_modules/.cache/

# 3. Verificar credenciales de admin en la base de datos
echo "🔍 3. Verificando credenciales de admin..."
echo ""
echo "SELECT id, username FROM admins WHERE username = 'tono';" | PGPASSWORD=tu_password_seguro psql -h localhost -U reservamesa_user -d reservamesa

# 4. Cargar variables de entorno
echo ""
echo "📋 4. Cargando variables de entorno..."
source ./env
echo "   ✅ EXPO_PUBLIC_RORK_API_BASE_URL=$EXPO_PUBLIC_RORK_API_BASE_URL"

# 5. Compilar frontend
echo ""
echo "📦 5. Compilando frontend con HTTPS (~90 segundos)..."
bunx expo export -p web --clear
BUNDLE=$(ls -t dist/_expo/static/js/web/*.js 2>/dev/null | head -1 | xargs basename 2>/dev/null)
if [ -n "$BUNDLE" ]; then
  echo "   ✅ Bundle generado: $BUNDLE"
else
  echo "   ❌ Error al generar bundle"
  exit 1
fi

# 6. Iniciar backend
echo ""
echo "🚀 6. Iniciando backend..."
cd /var/www/reservamesa
source ./env
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

# Verificar que el backend esté corriendo
if ps -p $BACKEND_PID > /dev/null; then
  echo "   ✅ Backend corriendo"
else
  echo "   ❌ Backend falló al iniciar"
  echo "   Ver logs: tail -20 backend.log"
  tail -20 backend.log
  exit 1
fi

# 7. Verificar configuración de Nginx
echo ""
echo "🌐 7. Verificando configuración de Nginx..."
sudo nginx -t
if [ $? -eq 0 ]; then
  echo "   ✅ Configuración válida"
else
  echo "   ❌ Error en configuración de Nginx"
  exit 1
fi

# 8. Iniciar Nginx
echo ""
echo "🔄 8. Iniciando Nginx..."
sudo systemctl start nginx
sudo systemctl reload nginx

# 9. Verificar HTTPS
echo ""
echo "🧪 9. Verificando HTTPS..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://quieromesa.com)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ HTTPS funciona correctamente (HTTP $HTTP_CODE)"
else
  echo "   ⚠️  HTTPS devolvió HTTP $HTTP_CODE"
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com/admin/login"
echo "📄 Bundle: $BUNDLE"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "🔑 CREDENCIALES DE ADMIN:"
echo "   Usuario: tono"
echo "   Contraseña: 1234"
echo ""
echo "⚠️  IMPORTANTE - Limpia el caché del navegador:"
echo "   1. Abre DevTools (F12)"
echo "   2. Clic derecho en el botón Recargar"
echo "   3. Selecciona 'Vaciar caché y recargar forzado'"
echo ""
echo "   O mejor: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔐 Verificar certificado SSL:"
echo "   curl -vI https://quieromesa.com"
