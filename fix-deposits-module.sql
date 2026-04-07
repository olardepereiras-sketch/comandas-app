-- Verificar y actualizar el módulo de fianzas
DO $$
BEGIN
    -- Insertar el módulo si no existe
    IF NOT EXISTS (SELECT 1 FROM restaurant_modules WHERE id = 'deposits') THEN
        INSERT INTO restaurant_modules (id, name, description, category, is_active, created_at, updated_at)
        VALUES ('deposits', 'Fianzas', 'Sistema de cobro de depósitos con Stripe', 'premium', true, NOW(), NOW());
    ELSE
        -- Actualizar para asegurarse de que está activo
        UPDATE restaurant_modules 
        SET is_active = true, 
            name = 'Fianzas',
            description = 'Sistema de cobro de depósitos con Stripe',
            category = 'premium'
        WHERE id = 'deposits';
    END IF;
    
    -- Agregar el módulo a todos los planes que no lo tienen
    UPDATE subscription_plans
    SET enabled_modules = (
        SELECT jsonb_agg(DISTINCT elem)
        FROM (
            SELECT jsonb_array_elements_text(
                CASE 
                    WHEN enabled_modules::text = '[]' OR enabled_modules IS NULL THEN '["deposits"]'::jsonb
                    WHEN enabled_modules::jsonb @> '["deposits"]'::jsonb THEN enabled_modules
                    ELSE enabled_modules || '["deposits"]'::jsonb
                END
            ) AS elem
        ) sub
    )
    WHERE NOT (enabled_modules::jsonb @> '["deposits"]'::jsonb)
       OR enabled_modules IS NULL;
END $$;

-- Verificar el resultado
SELECT id, name, enabled_modules FROM subscription_plans;
SELECT * FROM restaurant_modules WHERE id = 'deposits';
