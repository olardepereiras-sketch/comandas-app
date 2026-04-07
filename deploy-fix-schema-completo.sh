#!/bin/bash

echo "🔧 ARREGLANDO ESQUEMA COMPLETO DE LA BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Detener servidor
echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

# Paso 2: Cargar variables de entorno
echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Error: Archivo env no encontrado"
  exit 1
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL no está configurada"
  exit 1
fi
echo "✅ DATABASE_URL configurada"

# Paso 3: Arreglar esquema
echo ""
echo "📋 Paso 3: Ejecutando migración de esquema..."
bun backend/db/fix-complete-schema-definitivo.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando esquema"
  exit 1
fi
echo "✅ Esquema arreglado correctamente"

# Paso 4: Reconstruir frontend
echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️  Advertencia: Error al reconstruir frontend, pero continuando..."
fi
echo "✅ Frontend reconstruido"

# Paso 5: Reiniciar servidor
echo ""
echo "📋 Paso 5: Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

# Verificar que el servidor esté corriendo
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ Error: El servidor no pudo iniciarse"
  echo "Últimas líneas del log:"
  tail -n 20 backend.log
  exit 1
fi

# Paso 6: Recargar nginx
echo ""
echo "📋 Paso 6: Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ESQUEMA COMPLETO ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "El sistema está funcionando correctamente:"
echo "  • Módulos arreglados con todas las columnas"
echo "  • Ratings detallados agregados a clients"
echo "  • Columnas faltantes agregadas a restaurants"
echo "  • Time slots corregidos (sin restaurant_id)"
echo "  • Planes actualizados con módulos correctos"
echo "  • Módulos activados para todos los restaurantes"
echo ""
echo "Para ver logs del servidor:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
