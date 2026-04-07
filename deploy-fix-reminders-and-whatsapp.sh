#!/bin/bash

echo "🚀 Desplegando correcciones de recordatorios y WhatsApp..."

# Paso 1: Ejecutar migración de columnas de recordatorios
echo ""
echo "📦 Paso 1: Ejecutando migración de columnas de recordatorios..."
bun backend/db/fix-reminders-columns.ts
if [ $? -ne 0 ]; then
  echo "❌ Error en migración de recordatorios"
  exit 1
fi

# Paso 2: Limpiar archivos antiguos
echo ""
echo "📦 Paso 2: Limpiando archivos antiguos..."
rm -rf dist

# Paso 3: Construir aplicación
echo ""
echo "📦 Paso 3: Construyendo aplicación..."
npx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error en construcción"
  exit 1
fi

# Paso 4: Copiar archivos al servidor si estamos en producción
if [ "$1" == "production" ]; then
  echo ""
  echo "📦 Paso 4: Copiando archivos a producción..."
  
  # Detener servidor actual
  echo "🛑 Deteniendo servidor..."
  pkill -f "bun backend/server.ts" || true
  
  # Copiar archivos
  echo "📁 Copiando archivos..."
  cp -r dist/* /var/www/reservamesa/dist/
  
  # Reiniciar servidor
  echo "🔄 Reiniciando servidor..."
  cd /var/www/reservamesa
  nohup bun backend/server.ts > backend.log 2>&1 &
  
  # Esperar a que el servidor inicie
  sleep 3
  
  # Verificar que el servidor está corriendo
  if pgrep -f "bun backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
  else
    echo "❌ Error: El servidor no se inició correctamente"
    echo "📋 Últimas líneas del log:"
    tail -20 backend.log
    exit 1
  fi
  
  # Recargar nginx
  echo ""
  echo "📦 Paso 5: Recargando nginx..."
  nginx -s reload
  
  echo ""
  echo "✅ Despliegue completado exitosamente"
  echo "📝 Verificar logs: tail -f /var/www/reservamesa/backend.log"
else
  echo ""
  echo "✅ Construcción completada. Para desplegar a producción ejecuta:"
  echo "   ./deploy-fix-reminders-and-whatsapp.sh production"
fi
