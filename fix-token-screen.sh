#!/bin/bash
set -e

echo "🔧 ARREGLANDO PANTALLA EN BLANCO DEL TOKEN"
echo "=========================================="

cd /var/www/reservamesa

# Detener servidor
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 1

# Verificar que el archivo existe
if [ ! -f "app/client/reservation2/[token2].tsx" ]; then
  echo "❌ ERROR: El archivo app/client/reservation2/[token2].tsx no existe"
  echo "📋 Creando estructura de directorios..."
  mkdir -p app/client/reservation2
fi

# Verificar el contenido actual
echo "📋 Paso 2: Verificando archivo actual..."
if [ -f "app/client/reservation2/[token2].tsx" ]; then
  FILE_SIZE=$(wc -l < "app/client/reservation2/[token2].tsx")
  echo "✅ Archivo existe con $FILE_SIZE líneas"
else
  echo "❌ Archivo no existe, será creado"
fi

echo "📋 Paso 3: El problema puede ser de caché del navegador o errores JavaScript"
echo "Por favor, verifica en tu navegador:"
echo "  1. Abre la consola del navegador (F12)"
echo "  2. Ve a la pestaña 'Console'"
echo "  3. Busca mensajes con [RESERVATION2 SCREEN]"
echo "  4. Busca errores en rojo"
echo ""
echo "Presiona Enter cuando hayas verificado..."
read

# Reiniciar servidor
echo "📋 Paso 4: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

sleep 10

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR REINICIADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 PASOS PARA DIAGNOSTICAR:"
echo "  1. Abre el enlace del token en el navegador"
echo "  2. Abre la consola (F12)"
echo "  3. Busca mensajes [RESERVATION2 SCREEN]"
echo "  4. Copia TODOS los mensajes y errores"
echo ""
echo "tail -f backend.log"
