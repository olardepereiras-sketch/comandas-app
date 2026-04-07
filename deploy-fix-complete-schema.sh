#!/bin/bash

echo "🔧 ARREGLANDO ESQUEMA COMPLETO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f env ]; then
  export $(grep -v '^#' env | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

echo ""
echo "📋 Paso 3: Arreglando esquema..."
bun backend/db/fix-schema-complete-final.ts

if [ $? -ne 0 ]; then
  echo "❌ Error arreglando esquema"
  exit 1
fi

echo "✅ Esquema arreglado"

echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 5

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ El servidor no pudo iniciarse"
  echo "Últimas líneas del log:"
  tail -n 20 backend.log
  exit 1
fi

echo ""
echo "📋 Paso 6: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ESQUEMA ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los cambios incluyen:"
echo "  • Tabla modules arreglada (sin display_name)"
echo "  • Tabla time_slots global (sin restaurant_id)"
echo "  • ${#hours[@]} horas creadas (12:00 - 00:00)"
echo "  • Módulos asignados a planes de suscripción"
echo "  • Módulos activados para restaurantes"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
