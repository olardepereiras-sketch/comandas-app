#!/bin/bash

echo "🔧 Desplegando correcciones de Fianzas y Estadísticas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Limpiar y reconstruir
echo "📦 1. Limpiando caché..."
rm -rf dist .expo node_modules/.cache

# 2. Ejecutar el script SQL para el módulo de fianzas
echo "🗄️  2. Actualizando base de datos..."
PGPASSWORD="Raemail2025@" psql -U reservamesa_user -d reservamesa_db -h localhost -f fix-deposits-module.sql

# 3. Exportar frontend
echo "🌐 3. Exportando frontend..."
bunx expo export -p web --clear

# 4. Reiniciar backend
echo "🔄 4. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

# 5. Recargar nginx
echo "🔃 5. Recargando nginx..."
sudo systemctl reload nginx

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Despliegue completado"
echo ""
echo "Verifica:"
echo "  - https://quieromesa.com/admin/modules - El módulo Fianzas debe estar visible"
echo "  - https://quieromesa.com/restaurant/index - Fianzas debe aparecer en el panel"
echo "  - https://quieromesa.com/admin/statistics - El botón Guardar debe funcionar"
echo ""
echo "Para ver logs:"
echo "  tail -f backend.log"
