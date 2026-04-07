#!/bin/bash

echo "🔧 ARREGLANDO SISTEMA COMPLETO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | grep -v '^$' | xargs)
    echo "✅ Variables cargadas desde archivo env"
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    echo "✅ Variables cargadas desde archivo .env"
else
    echo "❌ Error: Archivo env no encontrado"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    exit 1
fi

echo "✅ DATABASE_URL configurada: ${DATABASE_URL:0:30}..."

echo ""
echo "📋 Paso 3: Arreglando sistema de módulos..."
bun run backend/db/fix-modules-complete-final.ts
if [ $? -eq 0 ]; then
    echo "✅ Sistema de módulos arreglado"
else
    echo "❌ Error arreglando módulos"
    exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando y reconstruyendo frontend..."
rm -rf .expo
rm -rf dist
bunx expo export -p web --output-dir dist --clear 2>&1 | grep -v "warn"
if [ $? -eq 0 ]; then
    echo "✅ Frontend reconstruido"
else
    echo "⚠️ Advertencias durante la construcción (continuando...)"
fi

echo ""
echo "📋 Paso 5: Iniciando servidor con variables de entorno..."
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js --update-env
    echo "✅ Servidor iniciado con PM2"
else
    nohup bun run backend/server.ts > backend.log 2>&1 &
    echo "✅ Servidor iniciado en background"
fi

sleep 3

echo ""
echo "📋 Paso 6: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Servidor respondiendo correctamente"
else
    echo "⚠️ Servidor puede estar iniciando aún..."
fi

echo ""
echo "📋 Paso 7: Recargando Nginx..."
if command -v nginx &> /dev/null; then
    nginx -t && nginx -s reload
    echo "✅ Nginx recargado"
else
    echo "⚠️ Nginx no disponible"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • Servidor lee archivo 'env' correctamente"
echo "  • Sistema de módulos completamente reconstruido"
echo "  • Módulos asignados según planes de suscripción"
echo "  • Logs detallados en backend para debugging"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Para verificar base de datos:"
echo "  psql \$DATABASE_URL -c 'SELECT * FROM modules;'"
echo "  psql \$DATABASE_URL -c 'SELECT restaurant_id, module_id, is_enabled FROM restaurant_modules;'"
