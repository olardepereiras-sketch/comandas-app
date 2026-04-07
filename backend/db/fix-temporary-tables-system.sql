-- Sistema de Mesas Temporales Mejorado
-- Las mesas temporales NO se mezclan con las mesas reales
-- Se crean en una tabla separada y se limpian automáticamente

-- Crear tabla de mesas temporales si no existe
CREATE TABLE IF NOT EXISTS temporary_tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  original_table_id TEXT,
  name TEXT NOT NULL,
  min_capacity INTEGER NOT NULL,
  max_capacity INTEGER NOT NULL,
  high_chairs INTEGER DEFAULT 0,
  allows_stroller BOOLEAN DEFAULT false,
  allows_pets BOOLEAN DEFAULT false,
  table_type TEXT NOT NULL CHECK (table_type IN ('split_a', 'split_b', 'grouped')),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_temporary_tables_reservation ON temporary_tables(reservation_id);
CREATE INDEX IF NOT EXISTS idx_temporary_tables_location ON temporary_tables(location_id);
CREATE INDEX IF NOT EXISTS idx_temporary_tables_original ON temporary_tables(original_table_id);
CREATE INDEX IF NOT EXISTS idx_temporary_tables_restaurant ON temporary_tables(restaurant_id);

-- Crear tabla de bloqueos de mesa (para bloquear mesas originales sin modificarlas)
CREATE TABLE IF NOT EXISTS table_blocks_for_split (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  blocked_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  UNIQUE(table_id, reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_table_blocks_split_table ON table_blocks_for_split(table_id);
CREATE INDEX IF NOT EXISTS idx_table_blocks_split_reservation ON table_blocks_for_split(reservation_id);

-- Eliminar mesas temporales huérfanas (reservas canceladas o completadas)
DELETE FROM temporary_tables 
WHERE reservation_id IN (
  SELECT id FROM reservations 
  WHERE status IN ('cancelled', 'completed', 'no_show')
);

-- Eliminar bloqueos huérfanos
DELETE FROM table_blocks_for_split
WHERE reservation_id IN (
  SELECT id FROM reservations 
  WHERE status IN ('cancelled', 'completed', 'no_show')
);

COMMENT ON TABLE temporary_tables IS 'Mesas temporales creadas al dividir o agrupar mesas. NO son mesas reales del restaurante.';
COMMENT ON TABLE table_blocks_for_split IS 'Bloqueos de mesas originales cuando se dividen. La mesa original NO se modifica, solo se bloquea.';
