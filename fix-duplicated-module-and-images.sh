#!/bin/bash

# Script para eliminar módulo duplicado y corregir URLs de imágenes

echo "🔧 Corrigiendo módulo duplicado y URLs de imágenes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Credenciales de la base de datos
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_PASSWORD="MiContrasenaSegura666"

echo ""
echo "1️⃣ Eliminando módulo duplicado 'fianzas'..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Mostrar módulos antes de eliminar
SELECT id, name, route, display_order, is_active 
FROM modules 
WHERE id IN ('fianzas', 'deposits');

-- Eliminar el módulo con ID 'fianzas' (el duplicado)
DELETE FROM modules WHERE id = 'fianzas';

-- Mostrar resultado final
SELECT id, name, route, display_order, is_active 
FROM modules 
WHERE id = 'deposits';

EOF

if [ $? -eq 0 ]; then
    echo "✅ Módulo duplicado eliminado correctamente"
else
    echo "❌ Error al eliminar módulo duplicado"
    exit 1
fi

echo ""
echo "2️⃣ Actualizando URLs de imágenes a absolutas..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Actualizar image_url y profile_image_url a URLs absolutas si son relativas
UPDATE restaurants 
SET 
  profile_image_url = CASE 
    WHEN profile_image_url LIKE '/uploads/%' 
    THEN 'https://quieromesa.com' || profile_image_url
    ELSE profile_image_url
  END,
  image_url = CASE 
    WHEN profile_image_url LIKE '/uploads/%' 
    THEN 'https://quieromesa.com' || profile_image_url
    WHEN image_url LIKE '/uploads/%' 
    THEN 'https://quieromesa.com' || image_url
    ELSE image_url
  END,
  updated_at = NOW()
WHERE profile_image_url LIKE '/uploads/%' 
   OR image_url LIKE '/uploads/%';

-- Mostrar resultado
SELECT id, name, 
       SUBSTRING(profile_image_url, 1, 60) as profile_image,
       SUBSTRING(image_url, 1, 60) as image
FROM restaurants 
WHERE profile_image_url IS NOT NULL OR image_url IS NOT NULL;

EOF

if [ $? -eq 0 ]; then
    echo "✅ URLs de imágenes actualizadas correctamente"
else
    echo "❌ Error al actualizar URLs de imágenes"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Correcciones aplicadas exitosamente"
echo ""
echo "📝 Cambios realizados:"
echo "   • Módulo 'fianzas' duplicado eliminado"
echo "   • URLs de imágenes convertidas a absolutas"
echo ""
echo "🔄 Reiniciando servidor..."

# Reiniciar el servidor
cd /var/www/reservamesa

# Matar procesos antiguos
pkill -f "bun.*server/index.ts" || true
sleep 2

# Iniciar servidor en background
nohup bun run backend/server/index.ts > backend.log 2>&1 &

echo "✅ Servidor reiniciado"
echo ""
echo "✅ Proceso completado. Verifica:"
echo "   1. Módulos en https://quieromesa.com/admin/modules"
echo "   2. Imagen en móvil en https://quieromesa.com/"
echo "   3. Limpia caché del navegador móvil (Ctrl+F5 o borrar caché)"
