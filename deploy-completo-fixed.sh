#!/bin/bash

echo "🚀 DEPLOY COMPLETO CON VERIFICACIÓN"
echo "===================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No estás en el directorio del proyecto"
    exit 1
fi

# PASO 1: Verificar archivos críticos
echo ""
echo "📋 PASO 1: Verificando archivos críticos..."
archivos_criticos=(
    "lib/trpc.ts"
    "app/_layout.tsx"
    "app/index.tsx"
    "backend/trpc/app-router.ts"
    "backend/server.ts"
)

faltan_archivos=false
for archivo in "${archivos_criticos[@]}"; do
    if [ ! -f "$archivo" ]; then
        echo "   ❌ FALTA: $archivo"
        faltan_archivos=true
    else
        echo "   ✅ $archivo"
    fi
done

if [ "$faltan_archivos" = true ]; then
    echo ""
    echo "❌ FALTAN ARCHIVOS CRÍTICOS"
    echo "Por favor, sube los archivos que faltan desde Windows:"
    echo ""
    echo "En PowerShell (C:\app):"
    echo 'scp lib/trpc.ts root@200.234.236.133:/var/www/reservamesa/lib/'
    echo 'scp app/_layout.tsx root@200.234.236.133:/var/www/reservamesa/app/'
    echo ""
    exit 1
fi

echo "✅ Todos los archivos críticos están presentes"

# PASO 2: Detener servicios
echo ""
echo "📋 PASO 2: Deteniendo servicios..."
pkill -f bun 2>/dev/null || true
sleep 2
echo "✅ Servicios detenidos"

# PASO 3: Limpiar builds
echo ""
echo "📋 PASO 3: Limpiando builds anteriores..."
rm -rf dist/ 2>/dev/null || true
rm -rf .expo/ 2>/dev/null || true
rm -rf node_modules/.cache/ 2>/dev/null || true
echo "✅ Builds limpiados"

# PASO 4: Verificar dependencias
echo ""
echo "📋 PASO 4: Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "   Instalando dependencias..."
    bun install
fi
echo "✅ Dependencias OK"

# PASO 5: Verificar base de datos
echo ""
echo "📋 PASO 5: Verificando base de datos..."
provincias=$(sudo -u postgres psql -d reservamesa_db -t -c "SELECT COUNT(*) FROM provinces;" 2>/dev/null | xargs)
if [ "$provincias" -gt 0 ]; then
    echo "✅ Base de datos OK (Provincias: $provincias)"
else
    echo "⚠️  La base de datos está vacía"
    echo "   Ejecuta: bun --env-file .env backend/db/init-complete-schema.ts"
fi

# PASO 6: Exportar frontend
echo ""
echo "📋 PASO 6: Exportando frontend..."
echo "   (Esto puede tardar 2-3 minutos)"

# Exportar con más información de debug
bunx expo export --platform web 2>&1 | tail -5

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ ERROR: El export falló"
    echo "   Ver detalles arriba"
    exit 1
fi

echo "✅ Frontend exportado"

# Verificar que index.html tiene contenido
tamanio=$(stat -f%z "dist/index.html" 2>/dev/null || stat -c%s "dist/index.html" 2>/dev/null)
if [ "$tamanio" -lt 100 ]; then
    echo "⚠️  Advertencia: index.html parece estar vacío o corrupto"
fi

# PASO 7: Verificar estructura de dist/
echo ""
echo "📋 PASO 7: Verificando estructura de dist/..."
echo "   Archivos en dist/:"
ls -lh dist/ | head -10
echo ""
echo "   Archivos JS en dist/_expo/static/js/web/:"
if [ -d "dist/_expo/static/js/web" ]; then
    ls -lh dist/_expo/static/js/web/ | head -5
    echo "✅ Estructura correcta"
else
    echo "❌ ERROR: Falta dist/_expo/static/js/web/"
    exit 1
fi

# PASO 8: Iniciar backend
echo ""
echo "📋 PASO 8: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
backend_pid=$!
echo "   PID: $backend_pid"

# Esperar que arranque
sleep 5

# Verificar que está corriendo
if ! ps -p $backend_pid > /dev/null; then
    echo "❌ ERROR: El backend no arrancó"
    echo "   Ver logs: tail -20 backend.log"
    exit 1
fi

# PASO 9: Probar el servidor
echo ""
echo "📋 PASO 9: Probando el servidor..."

# Health check
health=$(curl -s http://127.0.0.1:3000/api/health | grep -o '"status":"ok"' || echo "fail")
if [ "$health" != "fail" ]; then
    echo "✅ Health check: OK"
else
    echo "⚠️  Health check falló"
fi

# Probar que sirve index.html
index_size=$(curl -s -o /dev/null -w "%{size_download}" http://127.0.0.1:3000/)
if [ "$index_size" -gt 100 ]; then
    echo "✅ Frontend accesible (${index_size} bytes)"
else
    echo "❌ ERROR: index.html no se está sirviendo correctamente"
    echo "   Tamaño recibido: ${index_size} bytes"
fi

# Probar un archivo JS
js_file=$(ls dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -1 | sed 's|dist/||')
if [ -n "$js_file" ]; then
    js_size=$(curl -s -o /dev/null -w "%{size_download}" "http://127.0.0.1:3000/$js_file")
    if [ "$js_size" -gt 1000 ]; then
        echo "✅ Archivos JS accesibles (${js_size} bytes)"
    else
        echo "⚠️  Archivos JS no accesibles"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs:"
echo "   Frontend:  http://200.234.236.133"
echo "   Admin:     http://200.234.236.133/admin/locations"
echo ""
echo "📊 Comandos útiles:"
echo "   Ver logs:     tail -f backend.log"
echo "   Detener:      pkill -f bun"
echo "   Reiniciar:    bash $0"
echo ""
echo "🔍 Si la página sigue en blanco:"
echo "   1. Abre la consola del navegador (F12)"
echo "   2. Ve a la pestaña 'Network'"
echo "   3. Recarga la página"
echo "   4. Busca errores 404 o errores de carga"
echo "   5. Copia los errores y repórtalos"
echo ""
