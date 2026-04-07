-- Indices para optimizar queries de reservas (date + status son los filtros mas comunes)

-- Indice compuesto principal: date + status (cubre la mayoria de queries de planning y cleanup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_date_status
  ON reservations (date, status);

-- Indice para busquedas por restaurante + fecha (muy usado en available-slots y planning)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_restaurant_date
  ON reservations (restaurant_id, date);

-- Indice para busquedas por restaurante + fecha + estado (cubre cleanup worker)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_restaurant_date_status
  ON reservations (restaurant_id, date, status);

-- Indice para busquedas por cliente (ratings, historial)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_client_id
  ON reservations (client_id);

-- Indice en client_ratings para el cliente (se borra en cascada al borrar reservas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_ratings_client_id
  ON client_ratings (client_id);

-- Indice en client_ratings para el restaurante
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_ratings_restaurant_id
  ON client_ratings (restaurant_id);

-- Indice en whatsapp_notifications para limpiezas de huerfanos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_notif_reservation_id
  ON whatsapp_notifications (reservation_id)
  WHERE reservation_id IS NOT NULL;

-- Indice en waitlist para fecha + estado (cleanup worker)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waitlist_date_status
  ON waitlist (date, status);

-- Indice en tables para busquedas por restaurante + is_temporary (muy usado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tables_restaurant_temporary
  ON tables (restaurant_id, is_temporary);

-- Verificar indices creados
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE tablename IN ('reservations', 'client_ratings', 'whatsapp_notifications', 'waitlist', 'tables')
ORDER BY tablename, indexname;
