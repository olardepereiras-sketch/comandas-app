#!/bin/bash

echo "🚀 Desplegando corrección de notificaciones de cancelación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto"
  exit 1
fi

echo ""
echo "📋 Paso 1: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install

echo ""
echo "📋 Paso 2: Compilando frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Limpiando cache anterior..."
rm -rf dist .expo

echo "⚠️  Exportando aplicación web..."
bunx expo export -p web

echo ""
echo "📋 Paso 3: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Deteniendo procesos anteriores..."
pkill -f 'bun.*backend/server.ts' || true
sleep 2

echo "⚠️  Iniciando servidor en background..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 4: Recargando nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl reload nginx

echo ""
echo "📋 Paso 5: Verificando estado del sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que el servidor esté corriendo
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
    SERVER_PID=$(pgrep -f 'bun.*backend/server.ts')
    echo "✅ Servidor ejecutándose correctamente (PID: $SERVER_PID)"
else
    echo "❌ Error: El servidor no está ejecutándose"
    echo "📋 Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

# Verificar endpoint de salud
sleep 2
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Endpoint de salud respondiendo"
else
    echo "⚠️  Advertencia: Endpoint de salud no responde aún"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 CAMBIOS APLICADOS:"
echo "  ✅ Las notificaciones de cancelación ahora usan WhatsApp Web"
echo "  ✅ Si el restaurante tiene WhatsApp Web configurado, se envía por ahí"
echo "  ✅ Si no, usa Twilio como fallback"
echo "  ✅ Funciona tanto para cancelaciones por restaurante como por cliente"
echo ""
echo "📊 Comandos útiles:"
echo "  • Ver logs: tail -f backend.log"
echo "  • Reiniciar: pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo ""
