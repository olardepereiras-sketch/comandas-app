-- Verificar el ID actual del restaurante
SELECT id, name, slug FROM restaurants WHERE slug = 'o-lar-de-pereiras';

-- Actualizar el ID del restaurante a uno correcto
UPDATE restaurants 
SET id = 'rest-' || EXTRACT(EPOCH FROM NOW())::bigint || '-' || substring(md5(random()::text), 1, 8)
WHERE slug = 'o-lar-de-pereiras' AND id = 'TEMP_RESTAURANT_ID';

-- Verificar que se actualizó correctamente
SELECT id, name, slug FROM restaurants WHERE slug = 'o-lar-de-pereiras';
