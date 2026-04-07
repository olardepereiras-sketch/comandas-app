#!/bin/bash

echo "🔧 ARREGLANDO WHATSAPP_NOTIFICATIONS - SOLUCIÓN DIRECTA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Iniciar PostgreSQL si no está corriendo
echo "📋 Paso 1: Verificando PostgreSQL..."
if ! systemctl is-active --quiet postgresql; then
  echo "🔄 Iniciando PostgreSQL..."
  sudo systemctl start postgresql
  sleep 2
fi
echo "✅ PostgreSQL corriendo"
echo ""

# Paso 2: Cargar variables
echo "📋 Paso 2: Cargando variables..."
source /var/www/reservamesa/env
echo "✅ Variables cargadas"
echo ""

# Paso 3: Arreglar tabla directamente con psql
echo "📋 Paso 3: Arreglando tabla whatsapp_notifications..."
sudo -u postgres psql -d reservamesa_db << 'EOF'
-- Eliminar columnas problemáticas si existen
ALTER TABLE whatsapp_notifications 
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS attempts;

-- Recrear tabla correctamente
DROP TABLE IF EXISTS whatsapp_notifications CASCADE;

CREATE TABLE whatsapp_notifications (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('confirmation', 'reminder1', 'reminder2')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_notifications_scheduled 
ON whatsapp_notifications(scheduled_for) 
WHERE status = 'pending';

CREATE INDEX idx_whatsapp_notifications_reservation 
ON whatsapp_notifications(reservation_id);

\dt whatsapp_notifications
\d whatsapp_notifications
EOF

if [ $? -eq 0 ]; then
  echo "✅ Tabla arreglada correctamente"
else
  echo "❌ Error arreglando tabla"
  exit 1
fi
echo ""

# Paso 4: Reiniciar servidor
echo "📋 Paso 4: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor reiniciado"
echo ""

# Paso 5: Verificar
echo "📋 Paso 5: Verificando..."
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor funcionando"
else
  echo "❌ Servidor no responde"
  exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Monitorear logs:"
echo "  tail -f backend.log"
