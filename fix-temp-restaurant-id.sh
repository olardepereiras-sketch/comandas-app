#!/bin/bash

echo "🔧 Corrigiendo IDs temporales de restaurantes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar variables de entorno
if [ -f "env.production" ]; then
  export $(grep -v '^#' env.production | xargs)
else
  echo "❌ No se encontró env.production"
  exit 1
fi

# Ejecutar SQL para corregir los IDs temporales
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Primero mostrar los restaurantes con IDs temporales
SELECT id, name, slug FROM restaurants WHERE id LIKE 'TEMP_%';

-- Actualizar el restaurante con ID temporal a un UUID real
DO $$
DECLARE
  temp_id TEXT;
  new_id UUID;
  resto_name TEXT;
  resto_slug TEXT;
BEGIN
  -- Buscar restaurantes con ID temporal
  FOR temp_id, resto_name, resto_slug IN 
    SELECT id, name, slug FROM restaurants WHERE id LIKE 'TEMP_%'
  LOOP
    -- Generar nuevo UUID
    new_id := gen_random_uuid();
    
    RAISE NOTICE 'Actualizando % (%) de % a %', resto_name, resto_slug, temp_id, new_id;
    
    -- Actualizar todas las tablas relacionadas
    UPDATE table_locations SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE tables SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE schedules SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE schedule_day_exceptions SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE shift_templates SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE reservations SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE rating_criteria SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE client_ratings SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE unwanted_clients SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE restaurant_deposits_config SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    UPDATE restaurant_deposits_exceptions SET restaurant_id = new_id::text WHERE restaurant_id = temp_id;
    
    -- Finalmente actualizar el ID del restaurante
    UPDATE restaurants SET id = new_id::text WHERE id = temp_id;
    
  END LOOP;
END $$;

-- Verificar que ya no hay IDs temporales
SELECT COUNT(*) as temp_ids_remaining FROM restaurants WHERE id LIKE 'TEMP_%';

-- Mostrar todos los restaurantes
SELECT id, name, slug FROM restaurants ORDER BY created_at;
EOF

echo ""
echo "✅ IDs corregidos"
echo ""
echo "💡 Ahora reinicia el servidor:"
echo "   pm2 restart all"
