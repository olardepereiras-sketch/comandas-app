#!/bin/bash

echo "🔧 ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que PostgreSQL está corriendo
echo ""
echo "📋 Verificando PostgreSQL..."
sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ PostgreSQL no está corriendo. Ejecuta primero: ./fix-postgresql-now.sh"
  exit 1
fi

echo "✅ PostgreSQL está corriendo"

# Arreglar la tabla
echo ""
echo "📋 Eliminando tabla antigua si existe..."
sudo -u postgres psql -d reservamesa_db << 'EOF'
DROP TABLE IF EXISTS whatsapp_notifications CASCADE;
EOF

echo ""
echo "📋 Creando tabla con esquema correcto..."
sudo -u postgres psql -d reservamesa_db << 'EOF'
CREATE TABLE whatsapp_notifications (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('immediate', 'reminder_24h', 'reminder_2h', 'reminder_30m')),
  scheduled_for TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

CREATE INDEX idx_whatsapp_notifications_scheduled 
ON whatsapp_notifications(scheduled_for, status) 
WHERE status = 'pending';

CREATE INDEX idx_whatsapp_notifications_reservation 
ON whatsapp_notifications(reservation_id, status);
EOF

echo ""
echo "📋 Verificando tabla creada..."
sudo -u postgres psql -d reservamesa_db -c "\d whatsapp_notifications"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TABLA WHATSAPP_NOTIFICATIONS ARREGLADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
