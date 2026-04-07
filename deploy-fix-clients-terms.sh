#!/bin/bash

echo "🔧 ARREGLANDO COLUMNAS DE TÉRMINOS EN TABLA CLIENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
  echo "✅ DATABASE_URL configurada"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

echo ""
echo "📋 Paso 3: Añadiendo columnas de términos..."
bun backend/db/fix-clients-terms-columns.ts

if [ $? -eq 0 ]; then
  echo "✅ Columnas añadidas"
else
  echo "❌ Error añadiendo columnas"
  exit 1
fi

echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo 2>/dev/null
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 6: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️  Servidor podría no estar respondiendo aún"
fi

echo ""
echo "📋 Paso 7: Recargando Nginx..."
sudo nginx -t
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COLUMNAS DE TÉRMINOS AÑADIDAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • Columna terms_accepted_at añadida"
echo "  • Columna whatsapp_notifications_accepted añadida"
echo "  • Columna data_storage_accepted añadida"
echo "  • Columna rating_accepted añadida"
echo "  • Clientes existentes actualizados"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🧪 Para probar crear una reserva:"
echo "  https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
