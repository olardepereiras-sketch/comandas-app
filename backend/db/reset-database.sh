#!/bin/bash
# Script para resetear la base de datos usando el superusuario postgres
# Ejecutar como root: bash backend/db/reset-database.sh

set -e

echo "🧹 RESET COMPLETO DE BASE DE DATOS"
echo "===================================="
echo ""
echo "⚠️  ADVERTENCIA: Esto eliminará TODOS los datos"
echo "Presiona Ctrl+C en los próximos 5 segundos para cancelar..."
sleep 5

echo ""
echo "🗄️ Conectando como superusuario postgres..."

# Eliminar todas las tablas
sudo -u postgres psql -d reservamesa << 'EOF'
-- Eliminar todas las tablas CASCADE
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS client_ratings CASCADE;
DROP TABLE IF EXISTS rating_criteria CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS table_locations CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS subscription_durations CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Eliminar reglas si existen
DROP RULE IF EXISTS prevent_duplicate_restaurant ON tables;
DROP RULE IF EXISTS validate_restaurant_id ON tables;
DROP RULE IF EXISTS check_restaurant_exists ON tables;

\echo '✅ Tablas eliminadas'
EOF

echo ""
echo "📋 Ejecutando script de inicialización..."
cd /var/www/reservamesa
bun --env-file .env backend/db/init-complete-schema.ts

echo ""
echo "✅ Base de datos reseteada completamente"
echo ""
echo "📌 Próximos pasos:"
echo "   1. Ejecutar: bash vps-deploy-script.sh"
echo "   2. Acceder a: http://200.234.236.133/admin"
echo ""
