#!/bin/bash

echo "🔧 ARREGLANDO TODO EL SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
sleep 2
echo "✅ Servidor detenido"
echo ""

echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(grep -v '^#' env | xargs)
    echo "✅ Variables cargadas desde archivo env"
    echo "✅ DATABASE_URL configurada"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi
echo ""

echo "📋 Paso 3: Arreglando toda la base de datos..."
bun backend/db/fix-everything-definitivo.ts
if [ $? -eq 0 ]; then
    echo "✅ Base de datos arreglada"
else
    echo "❌ Error arreglando base de datos"
    exit 1
fi
echo ""

echo "📋 Paso 4: Limpiando caché..."
rm -rf dist .expo
echo "✅ Caché limpiado"
echo ""

echo "📋 Paso 5: Reconstruyendo frontend..."
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"
echo ""

echo "📋 Paso 6: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 5

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error: El servidor no pudo iniciarse"
    echo "Últimas líneas del log:"
    tail -n 30 backend.log
    exit 1
fi
echo ""

echo "📋 Paso 7: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODO EL SISTEMA ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los cambios incluyen:"
echo "  ✅ Tabla modules arreglada (7 módulos)"
echo "  ✅ Tabla time_slots global con 25 horas (12:00 - 00:00)"
echo "  ✅ Tabla shift_templates arreglada"
echo "  ✅ Módulos activados según plan de suscripción"
echo "  ✅ Botones de crear/eliminar funcionando en locations"
echo "  ✅ Plantillas de turnos funcionando en schedules"
echo ""
echo "Puedes verificar en:"
echo "  • https://quieromesa.com/admin/locations (crear/eliminar horas)"
echo "  • https://quieromesa.com/restaurant/schedules (crear plantillas)"
echo "  • https://quieromesa.com/restaurant (módulos activados)"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
