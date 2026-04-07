-- Script para limpiar mesas temporales de turnos anteriores
-- Ejecutar: psql -h localhost -U reservamesa_user -d reservamesa_db -f backend/db/cleanup-temporary-tables.sql

-- Eliminar mesas temporales de días anteriores
DELETE FROM tables 
WHERE is_temporary = TRUE 
AND shift_date IS NOT NULL 
AND shift_date < CURRENT_DATE;

-- Eliminar bloqueos expirados
DELETE FROM table_blocks 
WHERE end_time < NOW();

-- Mostrar mesas temporales restantes
SELECT id, name, shift_template_id, shift_date, is_temporary 
FROM tables 
WHERE is_temporary = TRUE 
ORDER BY shift_date, name;

-- Mostrar bloqueos activos
SELECT tb.id, t.name as table_name, tb.start_time, tb.end_time 
FROM table_blocks tb
JOIN tables t ON t.id = tb.table_id
WHERE tb.end_time > NOW()
ORDER BY tb.start_time;
