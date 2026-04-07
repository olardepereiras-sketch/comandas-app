#!/bin/bash

echo "================================================"
echo "DEPLOY: Corrección Modificación Reserva y Calendario"
echo "================================================"

echo ""
echo "Cambios incluidos:"
echo "1. ✅ Modificación de reserva: Elimina reserva antigua y crea nueva con mismo token"
echo "2. ✅ Calendario Reservas Pro: Comienza el lunes (7 columnas correctas)"
echo "3. ✅ Fix error 500: Corregido campo 'token' en consulta de slots disponibles"
echo ""

read -p "¿Continuar con el deploy? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "Deploy cancelado"
    exit 0
fi

echo ""
echo "📦 Construyendo frontend..."
npm run export

if [ $? -ne 0 ]; then
    echo "❌ Error al construir el frontend"
    exit 1
fi

echo ""
echo "📤 Subiendo archivos al servidor..."

# Subir archivos modificados
scp backend/trpc/routes/reservations/modify-by-client/route.ts root@200.234.236.133:/root/reservas/backend/trpc/routes/reservations/modify-by-client/
scp backend/trpc/routes/reservations/available-slots/route.ts root@200.234.236.133:/root/reservas/backend/trpc/routes/reservations/available-slots/
scp app/restaurant/reservations-pro.tsx root@200.234.236.133:/root/reservas/app/restaurant/

# Subir frontend compilado
scp -r dist/* root@200.234.236.133:/var/www/quieromesa.com/html/

echo ""
echo "🔄 Reiniciando servidor en VPS..."
ssh root@200.234.236.133 << 'ENDSSH'
cd /root/reservas

echo "Reiniciando servidor con PM2..."
pm2 restart reservas-server

echo "Esperando a que el servidor inicie..."
sleep 5

echo "Estado del servidor:"
pm2 status reservas-server

echo ""
echo "✅ Servidor reiniciado"
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Error al reiniciar el servidor"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ DEPLOY COMPLETADO"
echo "================================================"
echo ""
echo "Verificaciones realizadas:"
echo "✅ Frontend compilado y desplegado"
echo "✅ Backend actualizado"
echo "✅ Servidor reiniciado"
echo ""
echo "Pruebas recomendadas:"
echo "1. Modificar una reserva desde el token"
echo "2. Verificar que el calendario comience el lunes"
echo "3. Verificar que los días abiertos/cerrados funcionan"
echo ""
