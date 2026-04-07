-- Migración: Agregar columnas de configuración a carta digital
ALTER TABLE digital_menus
  ADD COLUMN IF NOT EXISTS show_allergen_filter BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_dietary_filter BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS custom_characteristics JSONB NOT NULL DEFAULT '[]';
