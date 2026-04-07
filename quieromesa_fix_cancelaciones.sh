#!/bin/bash

echo "🚀 QUIEROMESA - FIX SISTEMA DE CANCELACIONES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto"
  exit 1
fi

# Cargar variables de entorno
if [ -f ".env" ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "❌ Error: Archivo .env no encontrado"
  exit 1
fi

echo ""
echo "📋 Paso 1: Arreglando esquema de base de datos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun backend/db/fix-cancel-system.ts
if [ $? -ne 0 ]; then
  echo "❌ Error al arreglar esquema de base de datos"
  exit 1
fi

echo ""
echo "📋 Paso 2: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install

echo ""
echo "📋 Paso 3: Compilando frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Limpiando cache..."
rm -rf .expo dist
echo "⚠️  Exportando aplicación web..."
bunx expo export -p web --output-dir dist

echo ""
echo "📋 Paso 4: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Deteniendo procesos anteriores..."
pkill -f 'bun.*backend/server.ts' || true
sleep 2
echo "⚠️  Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 5: Verificando estado"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
  echo "✅ Servidor ejecutándose (PID: $(pgrep -f 'bun.*backend/server.ts'))"
else
  echo "❌ Error: El servidor no se inició correctamente"
  echo "Ver logs: tail -f backend.log"
  exit 1
fi

echo ""
echo "📋 Paso 6: Recargando nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ACTUALIZACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 PROBLEMAS RESUELTOS:"
echo "  ✅ Columna cancelled_by agregada a tabla reservations"
echo "  ✅ Columna updated_at agregada a tabla clients"
echo "  ✅ Cancelación por cliente notifica al restaurante"
echo "  ✅ Cancelación por restaurante notifica al cliente"
echo "  ✅ Mesas se liberan automáticamente al cancelar"
echo "  ✅ Notificaciones incluyen detalles completos (comensales, tronas, etc.)"
echo ""
echo "📊 Comandos útiles:"
echo "  • Ver logs: tail -f backend.log"
echo "  • Reiniciar: pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo ""
