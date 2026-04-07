-- Script para limpiar mesas temporales de días anteriores
-- Ejecutar manualmente: sudo -u postgres psql -d reservamesa_db -f backend/db/cleanup-old-temporary-tables.sql

-- 1. Mostrar mesas temporales que serán eliminadas
SELECT 'Mesas temporales a eliminar:' AS info;
SELECT id, name, shift_date, shift_template_id 
FROM tables 
WHERE is_temporary = TRUE 
AND shift_date < CURRENT_DATE
ORDER BY shift_date;

-- 2. Verificar si alguna tiene reservas activas
SELECT 'Mesas temporales con reservas activas (NO se eliminarán):' AS info;
SELECT DISTINCT t.id, t.name, t.shift_date, r.status
FROM tables t
INNER JOIN reservations r ON r.table_id = t.id
WHERE t.is_temporary = TRUE 
AND t.shift_date < CURRENT_DATE
AND r.status IN ('pending', 'confirmed', 'in_progress');

-- 3. Eliminar mesas temporales de días anteriores SIN reservas activas
DELETE FROM tables 
WHERE is_temporary = TRUE 
AND shift_date < CURRENT_DATE
AND shift_date IS NOT NULL
AND id NOT IN (
    SELECT DISTINCT t.id 
    FROM tables t
    INNER JOIN reservations r ON r.table_id = t.id
    WHERE t.is_temporary = TRUE 
    AND r.status IN ('pending', 'confirmed', 'in_progress')
);

-- 4. Limpiar bloqueos de división expirados
DELETE FROM table_blocks 
WHERE id LIKE 'block-split-%' 
AND end_time < NOW();

-- 5. Limpiar bloqueos de agrupación expirados
DELETE FROM table_blocks 
WHERE id LIKE 'block-group-%' 
AND end_time < NOW();

-- 6. Mostrar resultado
SELECT 'Limpieza completada. Mesas temporales restantes:' AS info;
SELECT id, name, shift_date, shift_template_id 
FROM tables 
WHERE is_temporary = TRUE
ORDER BY shift_date;
