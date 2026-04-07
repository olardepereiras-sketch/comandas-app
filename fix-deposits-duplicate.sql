-- Eliminar módulo duplicado de fianzas
-- Primero verificamos qué módulos existen
SELECT id, name, enabled FROM modules WHERE name LIKE '%fianza%' OR name LIKE '%deposit%';

-- Eliminar el módulo duplicado (mantenemos solo el que está en uso)
-- Si hay dos módulos con el mismo nombre, eliminamos el que tiene ID diferente al correcto
DELETE FROM modules 
WHERE name = 'fianzas' 
AND id NOT IN (
  SELECT DISTINCT module_id 
  FROM subscription_plan_modules 
  WHERE module_id IN (SELECT id FROM modules WHERE name = 'fianzas')
);

-- Verificar que solo queda un módulo de fianzas
SELECT id, name, enabled FROM modules WHERE name = 'fianzas';
