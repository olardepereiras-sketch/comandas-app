#!/bin/bash

# Script para desplegar la solución de limpieza de mesas temporales
# Este script:
# 1. Sube los archivos actualizados al servidor
# 2. Ejecuta la limpieza manual de mesas temporales antiguas
# 3. Reinicia el servidor para activar el nuevo worker

set -e

echo "🚀 Desplegando solución de limpieza de mesas temporales..."

# Configuración
VPS_USER="root"
VPS_HOST="www"
VPS_PATH="/var/www/reservamesa"

# 1. Subir archivos actualizados
echo "📤 Subiendo archivos..."
scp backend/services/temporary-tables-cleanup-worker.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/services/
scp backend/server.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/
scp backend/trpc/routes/tables/list-for-planning/route.ts ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/trpc/routes/tables/list-for-planning/
scp backend/db/cleanup-old-temporary-tables.sql ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/backend/db/

# 2. Ejecutar limpieza manual de mesas temporales antiguas
echo "🧹 Ejecutando limpieza de mesas temporales antiguas..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && sudo -u postgres psql -d reservamesa_db -f backend/db/cleanup-old-temporary-tables.sql"

# 3. Reiniciar el servidor
echo "🔄 Reiniciando servidor..."
ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && pm2 restart reservamesa || (pm2 delete reservamesa 2>/dev/null; pm2 start ecosystem.config.js)"

echo "✅ Despliegue completado"
echo ""
echo "📋 Cambios aplicados:"
echo "   - Worker automático que limpia mesas temporales cada hora"
echo "   - Filtrado estricto: solo se muestran mesas temporales del turno actual"
echo "   - Limpieza inicial de mesas temporales de días anteriores"
