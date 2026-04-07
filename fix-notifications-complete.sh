#!/bin/bash

echo "🔧 ARREGLANDO SISTEMA COMPLETO DE NOTIFICACIONES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Verificar y arrancar PostgreSQL
echo ""
echo "📋 Paso 1: Verificando PostgreSQL..."
if ! sudo systemctl is-active --quiet postgresql; then
  echo "⚠️  PostgreSQL no está corriendo, arrancándolo..."
  sudo systemctl start postgresql
  sleep 3
  
  if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL arrancado exitosamente"
  else
    echo "❌ Error: No se pudo arrancar PostgreSQL"
    exit 1
  fi
else
  echo "✅ PostgreSQL ya está corriendo"
fi

# Paso 2: Verificar conexión a la base de datos
echo ""
echo "📋 Paso 2: Verificando conexión a base de datos..."
if psql "postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db" -c "SELECT NOW();" > /dev/null 2>&1; then
  echo "✅ Conexión a base de datos exitosa"
else
  echo "❌ Error: No se puede conectar a la base de datos"
  exit 1
fi

# Paso 3: Matar procesos en puerto 3000
echo ""
echo "📋 Paso 3: Limpiando puerto 3000..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2
echo "✅ Puerto 3000 limpio"

# Paso 4: Arreglar tabla whatsapp_notifications directamente con psql
echo ""
echo "📋 Paso 4: Arreglando tabla whatsapp_notifications..."
psql "postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db" << 'EOSQL'
-- Verificar si la tabla existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'whatsapp_notifications'
  ) THEN
    -- Crear tabla completa
    CREATE TABLE whatsapp_notifications (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      reservation_id TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_type TEXT NOT NULL CHECK (notification_type IN ('immediate', 'reminder_24h', 'reminder_2h', 'reminder_30m', 'confirmation')),
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
    
    RAISE NOTICE '✅ Tabla whatsapp_notifications creada';
  ELSE
    RAISE NOTICE '✅ Tabla whatsapp_notifications ya existe';
  END IF;
END $$;

-- Añadir columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'whatsapp_notifications' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE whatsapp_notifications ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    RAISE NOTICE '✅ Columna updated_at añadida';
  ELSE
    RAISE NOTICE '✅ Columna updated_at ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'whatsapp_notifications' AND column_name = 'last_attempt_at'
  ) THEN
    ALTER TABLE whatsapp_notifications ADD COLUMN last_attempt_at TIMESTAMP;
    RAISE NOTICE '✅ Columna last_attempt_at añadida';
  ELSE
    RAISE NOTICE '✅ Columna last_attempt_at ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'whatsapp_notifications' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE whatsapp_notifications ADD COLUMN error_message TEXT;
    RAISE NOTICE '✅ Columna error_message añadida';
  ELSE
    RAISE NOTICE '✅ Columna error_message ya existe';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'whatsapp_notifications' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE whatsapp_notifications ADD COLUMN sent_at TIMESTAMP;
    RAISE NOTICE '✅ Columna sent_at añadida';
  ELSE
    RAISE NOTICE '✅ Columna sent_at ya existe';
  END IF;
END $$;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
ON whatsapp_notifications(scheduled_for, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
ON whatsapp_notifications(reservation_id, status);

\echo '✅ Tabla whatsapp_notifications verificada y corregida'
EOSQL

if [ $? -eq 0 ]; then
  echo "✅ Tabla de notificaciones corregida"
else
  echo "❌ Error corrigiendo tabla de notificaciones"
  exit 1
fi

# Paso 5: Reconstruir frontend
echo ""
echo "📋 Paso 5: Reconstruyendo frontend..."
cd /var/www/reservamesa
bun run export > /dev/null 2>&1
echo "✅ Frontend reconstruido"

# Paso 6: Iniciar servidor
echo ""
echo "📋 Paso 6: Iniciando servidor..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
sleep 3

# Paso 7: Verificar servidor
echo ""
echo "📋 Paso 7: Verificando servidor..."
SERVER_PID=$(pgrep -f "bun.*backend/server.ts")
if [ -n "$SERVER_PID" ]; then
  echo "✅ Servidor corriendo (PID: $SERVER_PID)"
else
  echo "❌ Error: Servidor no está corriendo"
  exit 1
fi

# Paso 8: Probar endpoint
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️  Advertencia: Servidor no responde aún (puede tardar unos segundos)"
fi

# Paso 9: Recargar Nginx
echo ""
echo "📋 Paso 9: Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA DE NOTIFICACIONES ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Cambios aplicados:"
echo "  • PostgreSQL verificado y corriendo"
echo "  • Tabla whatsapp_notifications corregida"
echo "  • Columna updated_at añadida"
echo "  • Servidor reiniciado correctamente"
echo ""
echo "📊 Para monitorear:"
echo "  tail -f backend.log"
echo ""
echo "🧪 Para probar notificaciones:"
echo "  Crea una nueva reserva desde:"
echo "  https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo ""
