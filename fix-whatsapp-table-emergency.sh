#!/bin/bash

echo "🔧 ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar que PostgreSQL esté corriendo
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ PostgreSQL no está corriendo${NC}"
    echo "Ejecuta primero: ./fix-postgresql-emergency.sh"
    exit 1
fi

echo "📋 Paso 1: Verificando tabla actual..."
TABLE_EXISTS=$(sudo -u postgres psql -d reservamesa_db -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_notifications');")

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "Tabla whatsapp_notifications existe, verificando columnas..."
    
    # Verificar si tiene la columna updated_at
    HAS_UPDATED_AT=$(sudo -u postgres psql -d reservamesa_db -tAc "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'whatsapp_notifications' AND column_name = 'updated_at');")
    
    if [ "$HAS_UPDATED_AT" = "f" ]; then
        echo -e "${YELLOW}⚠️ Falta la columna updated_at, eliminando y recreando tabla...${NC}"
        sudo -u postgres psql -d reservamesa_db -c "DROP TABLE IF EXISTS whatsapp_notifications CASCADE;"
    else
        echo -e "${GREEN}✅ Tabla tiene todas las columnas necesarias${NC}"
        exit 0
    fi
fi

echo ""
echo "📋 Paso 2: Creando tabla whatsapp_notifications..."
sudo -u postgres psql -d reservamesa_db << 'EOF'
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
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

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
ON whatsapp_notifications(scheduled_for, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
ON whatsapp_notifications(reservation_id, status);

-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON TABLE whatsapp_notifications TO reservamesa_user;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tabla whatsapp_notifications creada correctamente${NC}"
else
    echo -e "${RED}❌ Error creando tabla${NC}"
    exit 1
fi

echo ""
echo "📋 Paso 3: Verificando estructura..."
sudo -u postgres psql -d reservamesa_db -c "\d whatsapp_notifications"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ TABLA WHATSAPP_NOTIFICATIONS ARREGLADA${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
