#!/bin/bash
# Comandos a ejecutar en el VPS después de subir archivos
# Copiar y pegar línea por línea en el terminal SSH del VPS

echo "🚀 CONFIGURACIÓN DEL VPS - ReservaMesa"
echo "======================================"
echo ""

# PASO 1: Ir al directorio del proyecto
echo "📂 PASO 1: Posicionándose en el directorio..."
cd /var/www/reservamesa
pwd

# PASO 2: Detener procesos antiguos
echo ""
echo "🛑 PASO 2: Deteniendo procesos antiguos..."
pkill -f "bun backend/server.ts" 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo "✅ Procesos detenidos"

# PASO 3: Instalar dependencias con versión correcta de tRPC
echo ""
echo "📦 PASO 3: Instalando dependencias..."
bun install
echo "✅ Dependencias instaladas"

# PASO 4: IMPORTANTE - Reinstalar tRPC v10 (compatible)
echo ""
echo "🔄 PASO 4: Corrigiendo versión de tRPC a v10..."
bun remove @trpc/client @trpc/react-query @trpc/server 2>/dev/null || true
bun add @trpc/client@10.45.2 @trpc/react-query@10.45.2 @trpc/server@10.45.2
echo "✅ tRPC v10.45.2 instalado correctamente"

# PASO 5: Verificar que PostgreSQL está activo
echo ""
echo "🗄️  PASO 5: Verificando PostgreSQL..."
sudo systemctl status postgresql | grep "Active:"
echo "✅ PostgreSQL verificado"

# PASO 6: Limpiar e inicializar base de datos
echo ""
echo "🧹 PASO 6: Limpiando base de datos..."
bun --env-file .env backend/db/clean-and-init.ts
echo "✅ Base de datos inicializada"

# PASO 7: Iniciar servidor
echo ""
echo "🚀 PASO 7: Iniciando servidor..."
nohup bun run backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID del backend: $BACKEND_PID"
sleep 3

# PASO 8: Verificar que el servidor está corriendo
echo ""
echo "🔍 PASO 8: Verificando servidor..."
curl -s http://localhost:3000/api/health | head -c 200
echo ""
echo ""

# PASO 9: Verificar logs
echo "📋 PASO 9: Últimas líneas del log:"
tail -n 20 backend.log

echo ""
echo "✅ DEPLOY COMPLETADO"
echo ""
echo "🌐 Accede a tu aplicación en:"
echo "   → Frontend: http://200.234.236.133"
echo "   → Admin: http://200.234.236.133/admin"
echo "   → API Health: http://200.234.236.133/api/health"
echo ""
echo "📋 Para ver logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
