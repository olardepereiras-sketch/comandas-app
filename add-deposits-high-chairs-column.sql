-- Add deposits_include_high_chairs column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS deposits_include_high_chairs BOOLEAN DEFAULT TRUE;

-- Create deposit_orders table for tracking deposit payments
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
