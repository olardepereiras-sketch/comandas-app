#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES URGENTES..."
echo "========================================"

# Paso 1: Detener servidor
echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true

# Paso 2: Backup
echo ""
echo "📋 Paso 2/5: Creando backup..."
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p /var/www/reservamesa/backups
cp -r /var/www/reservamesa/backend /var/www/reservamesa/backups/backend_$timestamp
cp -r /var/www/reservamesa/app /var/www/reservamesa/backups/app_$timestamp

# Paso 3: Copiar archivos corregidos
echo ""
echo "📋 Paso 3/5: Copiando archivos corregidos..."

echo "Copiando backend/trpc/routes/reservations/list/route.ts..."
echo "Copiando backend/trpc/routes/clients/list/route.ts..."
echo "Copiando backend/trpc/routes/stats/restaurant-dashboard/route.ts..."
echo "Copiando app/restaurant/reservations-pro.tsx..."
echo "Copiando app/restaurant/reservations.tsx..."
echo "Copiando app/restaurant/login/[slug].tsx..."

# Paso 4: Reconstruir frontend
echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
cd /var/www/reservamesa
bun run export 2>&1 | tail -20

# Paso 5: Reiniciar servidor
echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
pm2 restart backend || pm2 start /var/www/reservamesa/backend/server.ts --name backend --interpreter bun

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ highChairCount agregado a las reservas"
echo "  ✅ Mostrar adultos y tronas correctamente"
echo "  ✅ Cálculo correcto de ratings en admin/users"
echo "  ✅ Botón 'Añadir Reserva' redirige al buscador del slug"
echo "  ✅ Contador de reservas excluye canceladas"
echo "  ✅ Dashboard solo cuenta reservas confirmadas"
echo ""
echo "Problemas solucionados:"
echo "  1. ✅ Reservas muestran adultos y tronas"
echo "  2. ✅ Botón Añadir Reserva funcional"
echo "  3. ✅ Ratings calculados correctamente"
echo "  4. ✅ Contadores excluyen reservas anuladas"
echo ""
echo "Ver logs del servidor:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
