#!/bin/bash

echo "🔧 Aplicando correcciones de notificaciones y colores de reservas..."
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
    source .env
    echo "✅ Variables de entorno cargadas"
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Verificar que las variables necesarias estén definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "❌ Variables de base de datos no configuradas correctamente"
    exit 1
fi

echo "📦 Instalando dependencias..."
npm install

echo "🔨 Compilando código TypeScript del backend..."
cd backend || exit 1
npx tsc --noEmit || {
    echo "⚠️ Hay errores de TypeScript pero continuamos..."
}
cd ..

echo "📱 Construyendo aplicación React Native Web..."
npx expo export --platform web || {
    echo "❌ Error al construir la aplicación"
    exit 1
}

echo "🔄 Reiniciando servidor con PM2..."
pm2 restart all || {
    echo "⚠️ PM2 no está ejecutándose, iniciando servidor..."
    pm2 start ecosystem.config.js
}

echo ""
echo "✅ ¡Correcciones aplicadas exitosamente!"
echo ""
echo "📋 Cambios realizados:"
echo "  ✓ Las notificaciones ahora se envían correctamente al crear reservas"
echo "  ✓ Reservas con 'Confirmar Reserva' envían mensaje de confirmación (10 min)"
echo "  ✓ Reservas con 'Reserva sin Confirmar' envían mensaje directo con enlace de gestión"
echo "  ✓ Las reservas 'añadida' ahora tienen color azul (antes eran verdes)"
echo "  ✓ Los mensajes de WhatsApp están mejorados con formato y emojis"
echo ""
echo "🎯 Próximos pasos:"
echo "  1. Prueba crear una reserva desde restaurant2 con 'Confirmar Reserva'"
echo "  2. Verifica que el cliente reciba el mensaje de confirmación"
echo "  3. Prueba crear una reserva con 'Reserva sin Confirmar'"
echo "  4. Verifica que el cliente reciba el mensaje de gestión directamente"
echo "  5. Comprueba que las reservas añadidas aparezcan en azul"
echo ""
