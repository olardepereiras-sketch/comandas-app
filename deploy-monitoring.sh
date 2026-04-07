#!/bin/bash

echo "🚀 Desplegando logs de monitoreo..."
echo "========================================"
echo ""

# 1. Compilar frontend con los nuevos logs
echo "📋 1. Compilando frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend compilado"
echo ""

# 2. Detener servidor
echo "📋 2. Deteniendo servidor actual..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"
echo ""

# 3. Iniciar servidor con logs
echo "📋 3. Iniciando servidor con logs detallados..."
echo "------------------------------------------------------------"
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error al iniciar el servidor"
    exit 1
fi
echo ""

# 4. Recargar nginx
echo "📋 4. Recargando nginx..."
echo "------------------------------------------------------------"
if command -v nginx &> /dev/null; then
    sudo systemctl reload nginx 2>/dev/null || echo "⚠️  nginx no se pudo recargar (puede estar detenido)"
else
    echo "⚠️  nginx no está instalado"
fi
echo ""

echo "========================================"
echo "✅ Despliegue completado"
echo ""
echo "🔍 Para monitorear en tiempo real, ejecuta:"
echo "   chmod +x monitor-real-time.sh"
echo "   ./monitor-real-time.sh"
echo ""
echo "📝 Para ver los últimos logs, ejecuta:"
echo "   tail -f backend.log | grep -E '(🔵|✅|❌)'"
echo ""
