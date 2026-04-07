#!/bin/bash

echo "================================================"
echo "🔧 Corrigiendo eliminación de usuarios nuevos"
echo "================================================"

cd /var/www/reservamesa

echo "✅ Copiando archivos actualizados..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' backend/services/pending-reservation-cleanup.ts root@quieromesa.com:/var/www/reservamesa/backend/services/

echo "✅ Reiniciando servidor backend..."
ssh root@quieromesa.com "cd /var/www/reservamesa && pm2 restart backend"

echo ""
echo "================================================"
echo "✅ CORRECCIÓN COMPLETADA"
echo "================================================"
echo ""
echo "El error 'operator does not exist: text ->> unknown' ha sido corregido."
echo "Ahora el sistema eliminará correctamente los usuarios nuevos (user_new)"
echo "cuando sus reservas estén pendientes o canceladas y la hora ya pasó."
echo ""
