-- Add shift-related columns to tables for temporary table filtering
-- Temporary tables (split/grouped) need to be associated with specific shifts

-- Add shift_template_id column if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'shift_template_id') THEN
    ALTER TABLE tables ADD COLUMN shift_template_id TEXT;
  END IF;
END $$;

-- Add shift_date column if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'shift_date') THEN
    ALTER TABLE tables ADD COLUMN shift_date TEXT;
  END IF;
END $$;

-- Add is_temporary column if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'is_temporary') THEN
    ALTER TABLE tables ADD COLUMN is_temporary BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add original_table_id column if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'original_table_id') THEN
    ALTER TABLE tables ADD COLUMN original_table_id TEXT;
  END IF;
END $$;

-- Add grouped_table_ids column if not exists (for grouped tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'grouped_table_ids') THEN
    ALTER TABLE tables ADD COLUMN grouped_table_ids TEXT;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tables_shift_template ON tables(shift_template_id) WHERE shift_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tables_shift_date ON tables(shift_date) WHERE shift_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tables_is_temporary ON tables(is_temporary) WHERE is_temporary = TRUE;

-- Clean up old temporary tables that don't have shift info (from previous implementation)
-- These will not appear in any shift since they have no shift_template_id
UPDATE tables SET is_temporary = FALSE WHERE is_temporary = TRUE AND shift_template_id IS NULL;

COMMENT ON COLUMN tables.shift_template_id IS 'ID del turno al que pertenece la mesa temporal';
COMMENT ON COLUMN tables.shift_date IS 'Fecha del turno para el que se creo la mesa temporal (YYYY-MM-DD)';
COMMENT ON COLUMN tables.is_temporary IS 'Indica si es una mesa temporal (dividida o agrupada)';
COMMENT ON COLUMN tables.original_table_id IS 'ID de la mesa original de la que se dividio';
COMMENT ON COLUMN tables.grouped_table_ids IS 'JSON array con IDs de las mesas agrupadas';
