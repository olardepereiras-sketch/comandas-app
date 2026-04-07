-- Solución para módulo Fianzas y configuración Stripe Admin

-- 1. Crear tabla de configuración de Stripe para Admin
CREATE TABLE IF NOT EXISTS admin_stripe_config (
  id VARCHAR(255) PRIMARY KEY DEFAULT 'admin-stripe-config',
  stripe_secret_key TEXT,
  stripe_publishable_key TEXT,
  stripe_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO admin_stripe_config (id, stripe_enabled)
VALUES ('admin-stripe-config', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Verificar que el módulo "deposits" esté en la tabla modules
INSERT INTO modules (id, name, description, category)
VALUES 
  ('deposits', 'Fianzas', 'Sistema de cobro de fianzas por reserva', 'premium')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- 3. Agregar módulo "deposits" a los planes que deberían tenerlo
-- Plan PRO
INSERT INTO plan_modules (plan_id, module_id)
SELECT 'pro', 'deposits'
WHERE NOT EXISTS (
  SELECT 1 FROM plan_modules WHERE plan_id = 'pro' AND module_id = 'deposits'
);

-- Plan PREMIUM
INSERT INTO plan_modules (plan_id, module_id)
SELECT 'premium', 'deposits'
WHERE NOT EXISTS (
  SELECT 1 FROM plan_modules WHERE plan_id = 'premium' AND module_id = 'deposits'
);

-- 4. Mostrar los módulos disponibles para verificar
SELECT * FROM modules WHERE id = 'deposits';

-- 5. Mostrar configuración de admin stripe
SELECT * FROM admin_stripe_config;

-- 6. Verificar que los restaurantes con planes PRO/PREMIUM tengan acceso
SELECT 
  r.id,
  r.name,
  r.subscription_plan,
  string_agg(pm.module_id, ', ') as modules_in_plan
FROM restaurants r
LEFT JOIN plan_modules pm ON pm.plan_id = r.subscription_plan
WHERE r.subscription_plan IN ('pro', 'premium')
GROUP BY r.id, r.name, r.subscription_plan;
