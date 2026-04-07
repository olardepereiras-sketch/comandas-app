#!/bin/bash

echo "🔍 Monitor en Tiempo Real - Borrado de Usuarios y Anulación de Reservas"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Instrucciones:"
echo "   1. Este script mostrará los logs en tiempo real"
echo "   2. Deja esta terminal abierta"
echo "   3. En otra ventana del navegador, intenta borrar un usuario o anular una reserva"
echo "   4. Los logs aparecerán aquí automáticamente"
echo ""
echo "⚠️  Para detener el monitor, presiona Ctrl+C"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "⏳ Esperando logs..."
echo ""

# Verificar si el proceso está corriendo
if ! pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "⚠️  ADVERTENCIA: El servidor no está corriendo"
    echo "   Inicia el servidor con: bun backend/server.ts &"
    echo ""
    echo "¿Deseas que este script inicie el servidor? (s/n)"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        echo "🚀 Iniciando servidor..."
        pkill -f "bun.*backend/server.ts" 2>/dev/null
        nohup bun backend/server.ts > backend.log 2>&1 &
        sleep 3
        echo "✅ Servidor iniciado"
        echo ""
    fi
fi

# Seguir los logs filtrando solo lo que nos interesa
tail -f backend.log 2>/dev/null | grep --line-buffered -E '(🔵|✅|❌|DELETE CLIENT|CANCEL RESERVATION|FRONTEND|ERROR|Error)' || {
    echo "❌ No se puede acceder a backend.log"
    echo ""
    echo "Intentando ver logs en tiempo real del proceso..."
    tail -f /tmp/backend-*.log 2>/dev/null || {
        echo "❌ No se encontraron archivos de logs"
        echo ""
        echo "📝 Logs desde pm2 (si está disponible):"
        if command -v pm2 &> /dev/null; then
            pm2 logs reservamesa --lines 50
        else
            echo "   pm2 no está instalado"
        fi
    }
}
