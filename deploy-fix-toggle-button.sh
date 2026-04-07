#!/bin/bash

echo "🚀 Desplegando corrección del botón toggle active..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

echo "📦 Instalando dependencias si es necesario..."
bun install

echo "🔨 Construyendo el frontend con correcciones..."
cd /home/user/rork-app
bun run build

echo "🔄 Reiniciando el servidor con PM2..."
pm2 restart reservamesa || pm2 start ecosystem.config.js --name reservamesa

echo "✅ Deploy completado!"
echo "🌐 La aplicación debería estar disponible en https://quieromesa.com"
echo ""
echo "📝 Cambios aplicados:"
echo "  - Corregido Alert.alert en React Native Web"
echo "  - Ahora usa window.confirm en web para el botón toggle"
echo "  - Los callbacks ahora se ejecutan correctamente"
echo ""
echo "🧪 Para probar:"
echo "  1. Abre https://quieromesa.com/restaurant"
echo "  2. Haz clic en el botón 'Activar' o 'Desactivar'"
echo "  3. Confirma en el diálogo"
echo "  4. El estado debería cambiar correctamente"
