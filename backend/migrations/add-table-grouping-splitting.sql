-- Agregar columnas para mesas temporales y divisiones
ALTER TABLE tables ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT FALSE;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS original_table_id VARCHAR(255);
ALTER TABLE tables ADD COLUMN IF NOT EXISTS linked_reservation_id VARCHAR(255);
ALTER TABLE tables ADD COLUMN IF NOT EXISTS available_high_chairs INTEGER DEFAULT 0;

-- Agregar columnas para grupos temporales
ALTER TABLE table_groups ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT FALSE;
ALTER TABLE table_groups ADD COLUMN IF NOT EXISTS linked_reservation_id VARCHAR(255);

-- Crear tabla para almacenar modificaciones temporales de mesas
CREATE TABLE IF NOT EXISTS table_modifications (
  id VARCHAR(255) PRIMARY KEY,
  table_id VARCHAR(255) NOT NULL,
  reservation_id VARCHAR(255) NOT NULL,
  original_min_capacity INTEGER NOT NULL,
  original_max_capacity INTEGER NOT NULL,
  original_high_chairs INTEGER DEFAULT 0,
  original_allows_stroller BOOLEAN DEFAULT FALSE,
  original_allows_pets BOOLEAN DEFAULT FALSE,
  modified_min_capacity INTEGER NOT NULL,
  modified_max_capacity INTEGER NOT NULL,
  modified_high_chairs INTEGER DEFAULT 0,
  modified_allows_stroller BOOLEAN DEFAULT FALSE,
  modified_allows_pets BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tables_is_temporary ON tables(is_temporary);
CREATE INDEX IF NOT EXISTS idx_tables_linked_reservation ON tables(linked_reservation_id);
CREATE INDEX IF NOT EXISTS idx_table_groups_is_temporary ON table_groups(is_temporary);
CREATE INDEX IF NOT EXISTS idx_table_groups_linked_reservation ON table_groups(linked_reservation_id);
CREATE INDEX IF NOT EXISTS idx_table_modifications_table_id ON table_modifications(table_id);
CREATE INDEX IF NOT EXISTS idx_table_modifications_reservation_id ON table_modifications(reservation_id);
