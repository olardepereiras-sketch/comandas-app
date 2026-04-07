-- Script de migración para crear tablas de tarifas y duraciones de suscripción
-- Ejecutar en Turso: turso db shell quieromesa-db < backend/db/create-subscription-tables.sql

-- ===================================
-- Tabla: subscription_plans
-- ===================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  enabled_modules TEXT NOT NULL, -- JSON array de módulos
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- ===================================
-- Tabla: subscription_durations
-- ===================================
CREATE TABLE IF NOT EXISTS subscription_durations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  months INTEGER NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_durations_active ON subscription_durations(is_active);

-- ===================================
-- Añadir columna subscription_duration_months a restaurants si no existe
-- ===================================
-- Nota: SQLite no soporta ALTER TABLE IF NOT EXISTS, ejecutar solo si no existe
-- ALTER TABLE restaurants ADD COLUMN subscription_duration_months INTEGER;

-- ===================================
-- Mostrar estructura de tablas creadas
-- ===================================
.schema subscription_plans
.schema subscription_durations
