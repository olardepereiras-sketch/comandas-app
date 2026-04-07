-- Agregar columna whatsapp_custom_message a la tabla restaurants
-- Este script es idempotente, se puede ejecutar múltiples veces

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurants' 
        AND column_name = 'whatsapp_custom_message'
    ) THEN
        ALTER TABLE restaurants 
        ADD COLUMN whatsapp_custom_message TEXT;
        
        RAISE NOTICE 'Columna whatsapp_custom_message agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna whatsapp_custom_message ya existe';
    END IF;
END $$;
