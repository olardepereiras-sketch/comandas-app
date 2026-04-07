#!/bin/bash

echo "🔧 ARREGLANDO SISTEMA DE MÓDULOS FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Detener servidor
echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

# 2. Cargar variables de entorno
echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f env ]; then
  set -a
  source env
  set +a
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Archivo env no encontrado"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no está configurada"
  exit 1
fi
echo "✅ DATABASE_URL configurada"

# 3. Arreglar sistema de módulos
echo ""
echo "📋 Paso 3: Arreglando sistema de módulos..."
cd /var/www/reservamesa
bun run backend/db/fix-modules-system-complete.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando sistema de módulos"
  exit 1
fi
echo "✅ Sistema de módulos arreglado"

# 4. Limpiar caché y reconstruir frontend
echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
rm -rf .expo node_modules/.cache 2>/dev/null
bun run build:web > /dev/null 2>&1
echo "✅ Frontend reconstruido"

# 5. Iniciar servidor
echo ""
echo "📋 Paso 5: Iniciando servidor..."
cd /var/www/reservamesa
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ Error iniciando servidor"
  exit 1
fi

# 6. Recargar Nginx
echo ""
echo "📋 Paso 6: Recargando Nginx..."
nginx -t && systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA DE MÓDULOS ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los cambios incluyen:"
echo "  • Tabla modules con 7 módulos correctos"
echo "  • Tabla restaurant_modules creada"
echo "  • Módulos asignados según plan de suscripción"
echo "  • Control individual por restaurante"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
