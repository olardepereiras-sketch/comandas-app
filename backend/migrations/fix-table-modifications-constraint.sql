-- Agregar constraint único a table_modifications para soportar ON CONFLICT
-- Este constraint permite que la operación ON CONFLICT funcione correctamente

-- Primero, eliminar registros duplicados si existen
DELETE FROM table_modifications a USING table_modifications b
WHERE a.id > b.id
  AND a.table_id = b.table_id
  AND a.reservation_id = b.reservation_id;

-- Crear el constraint único
ALTER TABLE table_modifications 
DROP CONSTRAINT IF EXISTS table_modifications_table_reservation_unique;

ALTER TABLE table_modifications 
ADD CONSTRAINT table_modifications_table_reservation_unique 
UNIQUE (table_id, reservation_id);

-- Verificar que el constraint se creó correctamente
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conname = 'table_modifications_table_reservation_unique';
