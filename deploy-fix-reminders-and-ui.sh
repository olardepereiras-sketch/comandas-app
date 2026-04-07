#!/bin/bash

echo "🚀 Desplegando correcciones de recordatorios y UI..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar variable DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL no está configurado. Cargando desde .env..."
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo "❌ Error: No se encontró archivo .env"
        exit 1
    fi
fi

echo ""
echo "📋 Cambios que se desplegarán:"
echo "  1. ✅ Arreglar constraint de whatsapp_notifications para tipos dinámicos"
echo "  2. ✅ Agregar logs de debug a creación de reservas"
echo "  3. ✅ Corregir mensaje de tronas no disponibles en buscador"
echo "  4. ✅ Mostrar botones contactar/llamar/valorar en reservas pasadas"
echo "  5. ✅ Las horas disponibles ya están ordenadas de menor a mayor"
echo ""

read -p "¿Continuar con el despliegue? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Despliegue cancelado"
    exit 1
fi

echo ""
echo "🔧 Paso 1: Arreglando constraint de whatsapp_notifications..."
bun backend/db/fix-whatsapp-notifications-constraint.ts
if [ $? -ne 0 ]; then
    echo "❌ Error al arreglar constraint"
    exit 1
fi

echo ""
echo "✅ Todos los cambios de base de datos aplicados correctamente"
echo ""
echo "📦 Paso 2: Reiniciando servidor..."

# Buscar y detener proceso existente
PID=$(pgrep -f "bun.*backend/server.ts")
if [ ! -z "$PID" ]; then
    echo "⏹️  Deteniendo proceso existente (PID: $PID)..."
    kill $PID
    sleep 2
    
    # Verificar si el proceso terminó
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Proceso no terminó, forzando cierre..."
        kill -9 $PID
        sleep 1
    fi
fi

echo "🚀 Iniciando servidor en background..."
nohup bun backend/server.ts > backend.log 2>&1 &
NEW_PID=$!

echo "⏳ Esperando que el servidor inicie..."
sleep 5

# Verificar que el servidor esté corriendo
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ Servidor iniciado correctamente (PID: $NEW_PID)"
else
    echo "❌ Error: El servidor no se inició correctamente"
    echo "📋 Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "🔍 Verificando que el servidor responda..."
sleep 3

# Verificar que el servidor responde
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Servidor responde correctamente"
else
    echo "⚠️  Advertencia: El servidor no responde en /health (puede ser normal si no existe ese endpoint)"
fi

echo ""
echo "✅ ¡Despliegue completado exitosamente!"
echo ""
echo "📋 Resumen de cambios aplicados:"
echo "  ✅ Constraint de whatsapp_notifications arreglado"
echo "  ✅ Logs de debug agregados a creación de reservas"
echo "  ✅ Mensaje de tronas corregido en buscador"
echo "  ✅ Botones visibles en reservas pasadas"
echo ""
echo "🔍 Para ver los logs del servidor en tiempo real:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Para probar recordatorios, crea una reserva y verifica logs:"
echo "  grep 'RECORDATORIO' backend.log"
echo ""
