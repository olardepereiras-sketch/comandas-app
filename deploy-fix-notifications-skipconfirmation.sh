#!/bin/bash

echo "🔧 Aplicando corrección de notificaciones con skipConfirmation..."
echo "================================================"

cd /var/www/reservamesa

echo "📦 Reconstruyendo el backend..."
bun run build:backend

if [ $? -ne 0 ]; then
  echo "❌ Error al construir el backend"
  exit 1
fi

echo "✅ Backend reconstruido"

echo "🔄 Reiniciando el servidor..."
pm2 restart reservamesa-server

if [ $? -ne 0 ]; then
  echo "❌ Error al reiniciar el servidor"
  exit 1
fi

echo "✅ Servidor reiniciado"

echo "📊 Verificando el estado del servidor..."
pm2 status

echo ""
echo "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "Cambios aplicados:"
echo "  ✓ Corregido error: skipConfirmation is not defined"
echo "  ✓ Las notificaciones ahora se envían correctamente"
echo "  ✓ El botón 'Reserva sin Confirmar' funciona correctamente"
echo "  ✓ Las reservas 'añadida' se muestran con color azul"
echo ""
echo "Verifica en:"
echo "  - https://quieromesa.com/client/restaurant2/"
echo ""
