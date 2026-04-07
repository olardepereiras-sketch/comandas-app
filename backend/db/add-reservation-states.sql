-- Añadir nuevos estados de reservas
-- Estados: pending, confirmed, in_progress, ratable, completed, cancelled, modified

-- No necesitamos ALTER TYPE porque ya usamos TEXT para status
-- Solo actualizamos las reservas existentes si es necesario

-- Verificar estados actuales
SELECT DISTINCT status FROM reservations;

-- Las reservas con status='rated' pasan a 'ratable' o 'completed' según su antigüedad
UPDATE reservations 
SET status = 'completed'
WHERE status = 'rated' 
  AND client_rated = true;

UPDATE reservations 
SET status = 'ratable'
WHERE status = 'rated' 
  AND client_rated = false
  AND rating_deadline IS NOT NULL
  AND rating_deadline > NOW();

UPDATE reservations 
SET status = 'completed'
WHERE status = 'rated' 
  AND client_rated = false
  AND (rating_deadline IS NULL OR rating_deadline <= NOW());

-- Verificar cambios
SELECT status, COUNT(*) FROM reservations GROUP BY status;
