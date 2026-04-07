#!/bin/bash

echo "🚀 Actualizando sistema de módulos..."
echo "========================================"

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables de entorno cargadas"

# Actualizar módulos en base de datos
echo ""
echo "📋 Actualizando módulos en base de datos..."
echo "------------------------------------------------------------"
bun backend/db/add-modules-table.ts

if [ $? -eq 0 ]; then
  echo "✅ Módulos actualizados"
else
  echo "❌ Error actualizando módulos"
  exit 1
fi

# Rebuild frontend
echo ""
echo "🔨 Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

if [ $? -eq 0 ]; then
  echo "✅ Frontend reconstruido"
else
  echo "❌ Error en build del frontend"
  exit 1
fi

# Restart backend
echo ""
echo "🔄 Reiniciando backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Backend reiniciado"

# Reload nginx
echo ""
echo "🌐 Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "✅ ¡Sistema de módulos actualizado!"
echo "Los módulos ahora incluyen:"
echo "  - Configuración"
echo "  - Configuración Pro"
echo "  - Reservas"
echo "  - Reservas Pro"
echo "  - Gestión Mesas"
echo "  - Horarios"
echo "  - Valoraciones"
echo "  - Compras (Próximamente)"
echo "  - Control Horario (Próximamente)"
