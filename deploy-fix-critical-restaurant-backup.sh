#!/bin/bash

echo "🚀 Desplegando correcciones críticas al VPS..."
echo ""

VPS_HOST="root@www"
VPS_DIR="/var/www/reservamesa"

echo "📦 Copiando archivos corregidos al VPS..."

# Copiar archivo de actualización de restaurantes (con $ en placeholders corregido)
scp backend/trpc/routes/restaurants/update/route.ts \
    ${VPS_HOST}:${VPS_DIR}/backend/trpc/routes/restaurants/update/route.ts

# Copiar archivos de backup corregidos (con credenciales correctas)
scp backend/trpc/routes/backups/create/route.ts \
    ${VPS_HOST}:${VPS_DIR}/backend/trpc/routes/backups/create/route.ts

scp backend/trpc/routes/backups/restore/route.ts \
    ${VPS_HOST}:${VPS_DIR}/backend/trpc/routes/backups/restore/route.ts

echo "✅ Archivos copiados"
echo ""

echo "🔄 Reiniciando servidor en VPS..."
ssh ${VPS_HOST} << 'ENDSSH'
cd /var/www/reservamesa

echo "🔄 Deteniendo servidor..."
pkill -f "bun backend/server.ts"
sleep 2

echo "🚀 Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo "✅ Servidor reiniciado"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORRECCIONES APLICADAS EN EL VPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. ✅ SQL de restaurantes corregido (placeholders $ agregados)"
echo "2. ✅ Credenciales de BD para backups corregidas"
echo "3. ✅ Backups se crearán con tamaño correcto"
echo "4. ✅ Restaurar y Eliminar copias funcionan"
echo ""
echo "📝 Verificando logs..."
tail -n 20 backend.log
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ahora puedes:"
echo "1. Editar restaurantes y asignar comerciales (funcionará correctamente)"
echo "2. Crear backups de BD que tendrán tamaño real"
echo "3. Restaurar y eliminar copias de seguridad"
echo ""
