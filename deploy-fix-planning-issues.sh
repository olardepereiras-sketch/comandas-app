#!/bin/bash
# Script para corregir problemas de Planning:
# 1. Error al agrupar mesas (operador text ->> no existe)
# 2. Mesas temporales apareciendo en otros turnos
# 3. Mesas bloqueadas no mostrando en rojo

set -e

echo "🔧 Aplicando correcciones de Planning..."

# Subir archivos actualizados
echo "📤 Subiendo archivos..."

# 1. Corregir query de agrupación
scp backend/trpc/routes/tables/group-tables-direct/route.ts root@quieromesa.com:/var/www/reservamesa/backend/trpc/routes/tables/group-tables-direct/

# 2. Subir script de limpieza
scp backend/db/cleanup-temporary-tables.sql root@quieromesa.com:/var/www/reservamesa/backend/db/

# 3. Actualizar frontend de planning
scp app/restaurant/planning-today.tsx root@quieromesa.com:/var/www/reservamesa/app/restaurant/

# Ejecutar limpieza en servidor
echo "🧹 Limpiando mesas temporales antiguas..."
ssh root@quieromesa.com "cd /var/www/reservamesa && PGPASSWORD=\$DB_PASSWORD psql -h localhost -U reservamesa_user -d reservamesa_db -f backend/db/cleanup-temporary-tables.sql"

# Reiniciar servidor
echo "🔄 Reiniciando servidor..."
ssh root@quieromesa.com "cd /var/www/reservamesa && pm2 restart reservamesa"

echo "✅ Correcciones aplicadas"
echo ""
echo "Para ejecutar manualmente la limpieza de mesas temporales:"
echo "PGPASSWORD=\$DB_PASSWORD psql -h localhost -U reservamesa_user -d reservamesa_db -f backend/db/cleanup-temporary-tables.sql"
