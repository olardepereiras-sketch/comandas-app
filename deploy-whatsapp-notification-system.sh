#!/bin/bash

echo "🚀 Desplegando sistema profesional de notificaciones WhatsApp..."
echo ""

echo "📦 Paso 1: Ejecutando migración de base de datos..."
bun backend/db/add-whatsapp-notifications-queue.ts
if [ $? -ne 0 ]; then
    echo "❌ Error en migración de base de datos"
    exit 1
fi
echo "✅ Migración completada"
echo ""

echo "📦 Paso 2: Limpiando archivos antiguos..."
rm -rf dist .expo
echo "✅ Archivos antiguos eliminados"
echo ""

echo "📦 Paso 3: Construyendo aplicación..."
bunx expo export -p web
if [ $? -ne 0 ]; then
    echo "❌ Error al construir aplicación"
    exit 1
fi
echo "✅ Aplicación construida"
echo ""

echo "📦 Paso 4: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"
echo ""

echo "📦 Paso 5: Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Notas importantes:"
echo "  • El worker de notificaciones se ejecuta cada 60 segundos"
echo "  • Las notificaciones fallidas se reintentarán hasta 3 veces"
echo "  • Si WhatsApp Web se desconecta, el sistema intentará reconectar automáticamente"
echo "  • Los recordatorios se programan automáticamente al crear reservas"
echo "  • Al cancelar una reserva, los recordatorios pendientes se eliminan automáticamente"
echo ""
echo "📝 Verificar logs: tail -f /var/www/reservamesa/backend.log"
