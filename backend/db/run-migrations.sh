#!/bin/bash

# Script para ejecutar migraciones en Turso
# Uso: ./backend/db/run-migrations.sh

echo "🚀 Ejecutando migraciones en Turso..."

# Verificar si turso CLI está instalado
if ! command -v turso &> /dev/null; then
    echo "❌ Error: turso CLI no está instalado"
    echo "Instálalo con: brew install chiselstrike/tap/turso"
    exit 1
fi

# Nombre de la base de datos
DB_NAME="quieromesa-db"

echo "📊 Creando tablas de subscription_plans y subscription_durations..."

# Ejecutar SQL directamente
turso db shell $DB_NAME << 'EOF'
-- Tabla: subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  enabled_modules TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Tabla: subscription_durations
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

-- Mostrar tablas creadas
SELECT '✅ Tabla subscription_plans creada' as status;
SELECT '✅ Tabla subscription_durations creada' as status;

.tables
EOF

echo "✅ Migraciones completadas"
