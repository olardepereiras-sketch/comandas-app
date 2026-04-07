#!/bin/bash

echo "🔧 ARREGLANDO CREACIÓN DE RESERVAS - VERSIÓN FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Detener servidor
echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"

# Paso 2: Cargar variables de entorno
echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi

# Paso 3: Limpiar caché completo
echo ""
echo "📋 Paso 3: Limpiando caché completo..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf dist
echo "✅ Caché limpiado"

# Paso 4: Reconstruir frontend
echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
bunx expo export -p web
echo "✅ Frontend reconstruido"

# Paso 5: Verificar cambios en el código
echo ""
echo "📋 Paso 5: Verificando cambios en create route..."
if grep -q "🔵 \[CREATE\] Verificando cliente existente" backend/trpc/routes/reservations/create/route.ts; then
    echo "✅ Cambios verificados en el código"
else
    echo "❌ Los cambios no están en el código"
    exit 1
fi

# Paso 6: Iniciar servidor
echo ""
echo "📋 Paso 6: Iniciando servidor..."
cd /var/www/reservamesa
DATABASE_URL="postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db" \
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

# Paso 7: Verificar servidor
echo ""
echo "📋 Paso 7: Verificando servidor..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Servidor respondiendo correctamente"
else
    echo "❌ Servidor no responde"
    exit 1
fi

# Paso 8: Recargar Nginx
echo ""
echo "📋 Paso 8: Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA ACTUALIZADO CON MEJOR DEBUG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Para ver los logs completos:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Ahora intenta crear una reserva de nuevo."
echo "   Deberías ver logs que comienzan con:"
echo "   🔵 [CREATE] Verificando cliente existente..."
echo "   🔵 [CREATE] Cliente no existe, creando nuevo..."
echo "   ❌ [CREATE] Error creando cliente: [mensaje de error]"
echo ""
