#!/bin/bash

# Script para corregir imagen del buscador y eliminar módulo duplicado

echo "🔧 Corrigiendo imagen del buscador y módulo duplicado..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Credenciales de la base de datos
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_PASSWORD="MiContrasenaSegura666"

echo ""
echo "1️⃣ Sincronizando campos de imagen en la base de datos..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Actualizar image_url con el valor de profile_image_url para todos los restaurantes
UPDATE restaurants 
SET image_url = profile_image_url, 
    updated_at = NOW()
WHERE profile_image_url IS NOT NULL 
  AND (image_url IS NULL OR image_url != profile_image_url);

-- Mostrar el resultado
SELECT id, name, profile_image_url, image_url 
FROM restaurants 
WHERE profile_image_url IS NOT NULL;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Imágenes sincronizadas correctamente"
else
    echo "❌ Error al sincronizar imágenes"
    exit 1
fi

echo ""
echo "2️⃣ Buscando módulos duplicados de 'fianzas'..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Mostrar todos los módulos de fianzas
SELECT id, name, route, display_order, is_active 
FROM modules 
WHERE name ILIKE '%fianza%' OR route ILIKE '%deposit%'
ORDER BY created_at;

EOF

echo ""
echo "3️⃣ Eliminando módulos duplicados..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'

-- Eliminar módulos duplicados que NO tengan la ruta /restaurant/deposits
-- Mantenemos solo el módulo correcto con ruta /restaurant/deposits
DELETE FROM modules 
WHERE (name = 'fianzas' OR name ILIKE '%fianza%')
  AND (route IS NULL OR route != '/restaurant/deposits');

-- Verificar que solo queda un módulo de fianzas
SELECT COUNT(*) as "Módulos de fianzas restantes", 
       id, name, route, is_active
FROM modules 
WHERE name ILIKE '%fianza%' OR route ILIKE '%deposit%'
GROUP BY id, name, route, is_active;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Módulos duplicados eliminados"
else
    echo "❌ Error al eliminar módulos duplicados"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Correcciones aplicadas exitosamente"
echo ""
echo "📝 Cambios realizados:"
echo "   • Imágenes sincronizadas en la base de datos"
echo "   • Módulos duplicados de fianzas eliminados"
echo ""
echo "🔄 Reiniciando servidor para aplicar cambios..."

# Reiniciar el servidor si está corriendo con PM2
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo "✅ Servidor reiniciado con PM2"
else
    echo "⚠️  PM2 no encontrado. Por favor reinicia el servidor manualmente."
fi

echo ""
echo "✅ Proceso completado. Verifica:"
echo "   1. La imagen en https://quieromesa.com/"
echo "   2. Los módulos en https://quieromesa.com/admin/modules"
