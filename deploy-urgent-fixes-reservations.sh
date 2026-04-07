#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES URGENTES DE RESERVAS..."
echo "=========================================="

echo ""
echo "📋 Cambios incluidos:"
echo "  ✅ Fix available slots para días con turnos start=end"
echo "  ✅ Edición de reservas solo permite 1 mesa"
echo "  ✅ Notificaciones al cancelar reserva"
echo "  ✅ Ordenamiento y colores según estado"
echo ""

echo "📋 Paso 1/5: Deteniendo servidor..."
pm2 stop reservamesa-backend || true

echo ""
echo "📋 Paso 2/5: Instalando dependencias..."
bun install

echo ""
echo "📋 Paso 3/5: Limpiando caché..."
rm -rf dist/
rm -rf .expo/
rm -rf node_modules/.cache/

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
npx expo export -p web --output-dir dist

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
pm2 restart reservamesa-backend
pm2 save

echo ""
echo "📋 Recargando nginx..."
sudo nginx -t && sudo nginx -s reload

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Available slots fix para días abiertos"
echo "  ✅ Edición de mesa única en reservas"  
echo "  ✅ Notificación email/WhatsApp al cancelar"
echo "  ✅ Reservas ordenadas por hora de llegada"
echo "  ✅ Colores: Verde claro → Verde intenso → Rosado"
echo ""
echo "Ver logs del servidor:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
