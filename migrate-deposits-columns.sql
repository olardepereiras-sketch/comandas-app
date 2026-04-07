-- ============================================================
-- MIGRACIÓN: Columnas del sistema de fianzas (deposits)
-- Ejecutar en PostgreSQL con:
-- psql -U postgres -d reservamesa -f migrate-deposits-columns.sql
-- ============================================================

-- 1. Columnas base del sistema de fianzas en restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS deposits_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposits_apply_to_all_days BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deposits_default_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposits_stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS deposits_stripe_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS deposits_stripe_publishable_key TEXT,
  ADD COLUMN IF NOT EXISTS deposits_custom_message TEXT,
  ADD COLUMN IF NOT EXISTS deposits_specific_days JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposits_include_high_chairs BOOLEAN DEFAULT TRUE;

-- 2. Tabla de órdenes de fianza (pagos Stripe)
CREATE TABLE IF NOT EXISTS deposit_orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_name TEXT NOT NULL,
  reservation_date TEXT,
  guests INTEGER,
  high_chair_count INTEGER DEFAULT 0,
  include_high_chairs BOOLEAN DEFAULT TRUE,
  deposit_per_person DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  chargeable_guests INTEGER,
  reservation_data JSONB,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  reservation_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Verificación final
SELECT 
  column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name LIKE 'deposits_%'
ORDER BY column_name;
