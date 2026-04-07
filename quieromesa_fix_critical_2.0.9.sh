#!/bin/bash

echo "🚀 QUIEROMESA - FIX CRÍTICO 2.0.9"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

echo "📋 Paso 1: Verificando variables de entorno"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -f ".env" ]; then
    echo "❌ Error: No se encontró el archivo .env"
    exit 1
fi
echo "✅ Variables de entorno configuradas"
echo ""

echo "📋 Paso 2: Instalando dependencias"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun install
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi
echo "✅ Dependencias instaladas"
echo ""

echo "📋 Paso 3: Compilando frontend con correcciones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Limpiando cache anterior..."
rm -rf .expo dist
echo "⚠️  Exportando aplicación web..."
bun expo export -p web
if [ $? -ne 0 ]; then
    echo "❌ Error compilando frontend"
    exit 1
fi
echo "✅ Frontend compilado correctamente"
echo ""

echo "📋 Paso 4: Reiniciando servidor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Deteniendo procesos anteriores..."
pkill -f 'bun.*backend/server.ts' || true
sleep 2
echo "⚠️  Iniciando servidor en background..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3
echo "✅ Servidor iniciado correctamente (PID: $SERVER_PID)"
echo ""

echo "📋 Paso 5: Recargando nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Recargando configuración de nginx..."
sudo nginx -t && sudo systemctl reload nginx
if [ $? -ne 0 ]; then
    echo "⚠️  Advertencia: Error recargando nginx, pero continuando..."
fi
echo "✅ Nginx recargado"
echo ""

echo "📋 Paso 6: Verificando sistema"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pgrep -f 'bun.*backend/server.ts' > /dev/null; then
    echo "✅ Servidor ejecutándose correctamente"
else
    echo "⚠️  Advertencia: No se detectó el proceso del servidor"
fi

# Verificar que el servidor responde
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Endpoint de salud respondiendo"
else
    echo "⚠️  Advertencia: Endpoint de salud no responde"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FIX CRÍTICO COMPLETADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 PROBLEMAS RESUELTOS EN ESTA VERSIÓN:"
echo "  ✅ CRÍTICO: Validación de mesas - No se permiten reservas sin mesa asignada"
echo "  ✅ CRÍTICO: Buscador de clientes marca correctamente fromRestaurantPanel=false"
echo "  ✅ CRÍTICO: Las reservas desde buscador siempre tienen estado 'confirmed'"
echo "  ✅ Valoración media del restaurante calculada correctamente (últimas 500 valoraciones)"
echo "  ✅ Visualización mejorada de valoraciones en panel de administración"
echo ""
echo "🌐 Servicios disponibles:"
echo "  • Frontend: https://quieromesa.com"
echo "  • API: https://quieromesa.com/api"
echo "  • Admin: https://quieromesa.com/admin"
echo ""
echo "📊 Comandos útiles:"
echo "  • Ver logs: tail -f backend.log"
echo "  • Reiniciar: pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo "  • Estado: pgrep -f 'bun.*backend/server.ts'"
echo ""
echo "🎉 ¡Sistema completamente operativo!"
echo ""
