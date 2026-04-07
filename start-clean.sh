#!/bin/bash

echo "🚀 Inicio Limpio del Servidor"
echo "════════════════════════════════════════════════════════"

# 1. Cargar .env
echo ""
echo "📋 1. Cargando variables de entorno..."
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Limpiar DATABASE_URL de comillas si las tiene
sed -i 's/^DATABASE_URL="\(.*\)"$/DATABASE_URL=\1/' .env 2>/dev/null
sed -i "s/^DATABASE_URL='\(.*\)'$/DATABASE_URL=\1/" .env 2>/dev/null

export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"

# 2. Verificar conexión a DB
echo ""
echo "📋 2. Verificando base de datos..."
bun backend/db/fix-env-and-restart.ts

if [ $? -ne 0 ]; then
    echo "❌ Error con la base de datos - corrige los errores arriba"
    exit 1
fi

# 3. Matar procesos anteriores
echo ""
echo "📋 3. Deteniendo procesos anteriores..."
pkill -9 -f "bun.*backend/server.ts" 2>/dev/null && echo "✅ Procesos anteriores detenidos" || echo "⚠️  No había procesos"
sleep 2

# 4. Limpiar logs antiguos
echo ""
echo "📋 4. Limpiando logs antiguos..."
> backend.log
echo "✅ Logs limpiados"

# 5. Compilar frontend
echo ""
echo "📋 5. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web 2>&1 | tail -3
if [ ! -d "dist" ]; then
    echo "❌ Error compilando frontend"
    exit 1
fi
echo "✅ Frontend compilado"

# 6. Iniciar servidor
echo ""
echo "📋 6. Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "Servidor iniciado (PID: $SERVER_PID)"

# Esperar y verificar
echo "Esperando que el servidor inicie..."
sleep 5

if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ El servidor se crasheó al iniciar"
    echo ""
    echo "Error en el log:"
    cat backend.log
    exit 1
fi

# 7. Health check
echo ""
echo "📋 7. Verificando health check..."
for i in {1..5}; do
    if curl -s http://localhost:3000/api/health | grep -q "ok"; then
        echo "✅ Health check OK"
        break
    fi
    echo "   Intento $i/5..."
    sleep 2
done

# 8. Mostrar info
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Servidor iniciado correctamente"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://200.234.236.133"
echo "   API: http://200.234.236.133/api"
echo "   Health: http://200.234.236.133/api/health"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log"
echo ""
echo "🧪 Probar borrado:"
echo "   chmod +x test-delete-endpoint.sh"
echo "   ./test-delete-endpoint.sh"
echo ""

# 9. Recargar nginx
echo "📋 8. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null && echo "✅ Nginx recargado" || echo "⚠️  Nginx no activo"

echo ""
echo "🎉 Listo! El servidor está corriendo"
