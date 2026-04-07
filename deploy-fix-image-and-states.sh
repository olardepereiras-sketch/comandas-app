#!/bin/bash

echo "🔧 Corrigiendo imagen de portada y estados de reservas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuración de conexión
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_HOST="localhost"

echo ""
echo "1️⃣ Actualizando estados de reservas..."

# Migrar estados antiguos a los nuevos
psql -U $DB_USER -d $DB_NAME -h $DB_HOST << 'EOF'

-- Verificar estados actuales
SELECT 'Estados actuales:' as info;
SELECT status, COUNT(*) as cantidad FROM reservations GROUP BY status;

-- Actualizar reservas con status='rated' según su antigüedad
-- Las que ya fueron valoradas pasan a 'completed'
UPDATE reservations 
SET status = 'completed'
WHERE status = 'rated' 
  AND client_rated = true;

-- Las que están en periodo de valoración pasan a 'ratable'
UPDATE reservations 
SET status = 'ratable'
WHERE status = 'rated' 
  AND client_rated = false
  AND rating_deadline IS NOT NULL
  AND rating_deadline > NOW();

-- Las que pasaron el periodo sin valorar pasan a 'completed'
UPDATE reservations 
SET status = 'completed'
WHERE status = 'rated' 
  AND client_rated = false
  AND (rating_deadline IS NULL OR rating_deadline <= NOW());

-- Verificar cambios
SELECT 'Estados después de migración:' as info;
SELECT status, COUNT(*) as cantidad FROM reservations GROUP BY status;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Estados actualizados correctamente"
else
    echo "❌ Error al actualizar estados"
    exit 1
fi

echo ""
echo "2️⃣ Verificando columnas de imagen en restaurants..."

psql -U $DB_USER -d $DB_NAME -h $DB_HOST << 'EOF'

-- Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
  AND column_name IN ('profile_image_url', 'image_url');

-- Sincronizar image_url con profile_image_url si existe diferencia
UPDATE restaurants 
SET image_url = profile_image_url
WHERE image_url IS DISTINCT FROM profile_image_url;

-- Mostrar imágenes actuales
SELECT id, name, profile_image_url, image_url 
FROM restaurants 
WHERE id LIKE 'rest-%'
LIMIT 5;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Columnas de imagen verificadas"
else
    echo "❌ Error al verificar columnas"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Correcciones aplicadas"
echo ""
echo "📝 Cambios realizados:"
echo "   • Estados de reservas migrados al nuevo sistema"
echo "   • Columnas de imagen sincronizadas"
echo ""
echo "🔄 Por favor, reinicia el servidor para aplicar cambios:"
echo "   cd /var/www/reservamesa"
echo "   pm2 restart all"
echo ""
echo "✅ Proceso completado"
