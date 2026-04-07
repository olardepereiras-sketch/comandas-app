-- Arreglar tabla whatsapp_notifications
-- Añadir columna updated_at si no existe

-- Primero, verificar y añadir updated_at
ALTER TABLE whatsapp_notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Actualizar valores existentes
UPDATE whatsapp_notifications 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Hacer la columna NOT NULL
ALTER TABLE whatsapp_notifications 
ALTER COLUMN updated_at SET NOT NULL;

-- Mostrar estructura final
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_notifications'
ORDER BY ordinal_position;
