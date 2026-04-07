-- Eliminar módulo duplicado de fianzas
-- Mantener solo el módulo 'deposits' y eliminar 'fianzas'

BEGIN;

-- Verificar qué módulos existen
SELECT id, name, route, is_active FROM modules WHERE name = 'Fianzas';

-- Eliminar el módulo 'fianzas' (mantenemos 'deposits')
DELETE FROM modules WHERE id = 'fianzas';

-- Actualizar las relaciones en subscription_plan_modules si es necesario
-- (eliminar referencias al módulo 'fianzas')
DELETE FROM subscription_plan_modules WHERE module_id = 'fianzas';

-- Verificar que solo queda el módulo 'deposits'
SELECT id, name, route, is_active FROM modules WHERE name = 'Fianzas';

COMMIT;
