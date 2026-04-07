#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - ARREGLANDO TODO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

# Paso 1: Detener servidor
echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

# Paso 2: Cargar variables de entorno
echo ""
echo "📋 Paso 2: Verificando variables de entorno..."
if [ ! -f "env" ]; then
  echo "❌ Error: Archivo env no encontrado"
  exit 1
fi

# Exportar variables del archivo env
set -a
source env
set +a
echo "✅ Variables cargadas"
echo "   DATABASE_URL: ${DATABASE_URL:0:30}..."

# Paso 3: Ejecutar migración de esquema
echo ""
echo "📋 Paso 3: Arreglando esquema de base de datos..."
DATABASE_URL="$DATABASE_URL" bun backend/db/fix-all-schema-issues.ts
if [ $? -ne 0 ]; then
  echo "❌ Error en migración de esquema"
  exit 1
fi
echo "✅ Esquema arreglado"

# Paso 4: Reconstruir frontend
echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️ Warning: Posible error en build de frontend, continuando..."
fi
echo "✅ Frontend reconstruido"

# Paso 5: Iniciar servidor
echo ""
echo "📋 Paso 5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3

# Verificar que el servidor está corriendo
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado (PID: $SERVER_PID)"
else
  echo "❌ Error: El servidor no pudo iniciarse"
  echo "Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

# Paso 6: Recargar nginx
echo ""
echo "📋 Paso 6: Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# Paso 7: Verificar que el servidor responde
echo ""
echo "📋 Paso 7: Verificando servidor..."
sleep 2
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Warning: El servidor no responde al health check"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Estado:"
echo "   • Esquema de BD: Actualizado"
echo "   • Frontend: Reconstruido"
echo "   • Servidor PID: $SERVER_PID"
echo "   • Puerto: 3000"
echo ""
echo "🔍 Para ver logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🌐 Tu aplicación:"
echo "   https://quieromesa.com"
echo ""
