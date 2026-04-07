-- ============================================================
-- MIGRACIÓN: Sistema de Comandas
-- Ejecutar en la base de datos PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla principal de comandas
CREATE TABLE IF NOT EXISTS comanda_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  table_id UUID,
  table_name VARCHAR(100) NOT NULL,
  location_id UUID,
  location_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  guests INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  waiter_name VARCHAR(100),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT chk_comanda_status CHECK (status IN ('open','closed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_comanda_orders_restaurant ON comanda_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_comanda_orders_status ON comanda_orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_comanda_orders_table ON comanda_orders(table_id);

-- Items de cada comanda
CREATE TABLE IF NOT EXISTS comanda_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES comanda_orders(id) ON DELETE CASCADE,
  menu_item_id UUID,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_variant VARCHAR(20) NOT NULL DEFAULT 'price1',
  price_variant_name VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  course VARCHAR(20) NOT NULL DEFAULT 'main',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_item_course CHECK (course IN ('starter','main','dessert','drink','other')),
  CONSTRAINT chk_item_status CHECK (status IN ('pending','preparing','ready','served'))
);

CREATE INDEX IF NOT EXISTS idx_comanda_items_order ON comanda_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_comanda_items_status ON comanda_order_items(order_id, status);

-- Planos de sala (posicionado de mesas)
CREATE TABLE IF NOT EXISTS comanda_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  location_id UUID NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_restaurant ON comanda_floor_plans(restaurant_id);

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comanda_orders_updated_at ON comanda_orders;
CREATE TRIGGER update_comanda_orders_updated_at
  BEFORE UPDATE ON comanda_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comanda_items_updated_at ON comanda_order_items;
CREATE TRIGGER update_comanda_items_updated_at
  BEFORE UPDATE ON comanda_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
