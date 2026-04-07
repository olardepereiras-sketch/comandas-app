#!/bin/bash

echo "🔧 Diagnóstico y solución de WhatsApp..."
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1: Cargando variables de entorno..."
export $(grep -v '^#' env | grep -v '^$' | xargs)

echo "✅ Variables cargadas"
echo ""

echo "🔍 Paso 2: Verificando configuración de base de datos..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi

if [[ "$DATABASE_URL" == *"tu_password_seguro"* ]]; then
  echo "❌ ERROR CRÍTICO: La contraseña de PostgreSQL es un placeholder"
  echo ""
  echo "⚠️  DEBES CAMBIAR LA CONTRASEÑA en el archivo 'env':"
  echo "   Línea 17: DATABASE_URL=postgresql://reservamesa_user:TU_CONTRASEÑA_REAL@localhost:5432/reservamesa"
  echo "   Línea 23: EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:TU_CONTRASEÑA_REAL@localhost:5432/reservamesa"
  echo ""
  echo "📝 Para obtener la contraseña correcta, ejecuta:"
  echo "   sudo -u postgres psql -c \"\\du\""
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL configurada"
echo ""

echo "🔍 Paso 3: Ejecutando diagnóstico de WhatsApp..."
echo ""
bun run backend/db/diagnose-whatsapp-config-complete.ts

echo ""
echo "=" | head -c 70
echo ""
echo "📊 ANÁLISIS COMPLETADO"
echo ""
echo "💡 PASOS SIGUIENTES:"
echo ""
echo "1️⃣  Si la contraseña de base de datos es incorrecta:"
echo "   - Edita el archivo 'env' con la contraseña correcta"
echo "   - Reinicia el servidor: pm2 restart reservamesa"
echo ""
echo "2️⃣  Si auto_send_whatsapp está DESACTIVADO:"
echo "   - Ve a https://quieromesa.com/restaurant/config-pro"
echo "   - Activa 'Enviar WhatsApp automáticamente'"
echo "   - Activa 'Usar WhatsApp Web'"
echo ""
echo "3️⃣  Si use_whatsapp_web está DESACTIVADO:"
echo "   - Verifica que la sesión de WhatsApp Web esté conectada"
echo "   - Revisa los logs: pm2 logs reservamesa"
echo ""
