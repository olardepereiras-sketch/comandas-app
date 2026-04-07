import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addWhatsAppNotificationsQueue() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔧 Creando tabla whatsapp_notifications...');

    await client.query(`
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
      )
    `);

    console.log('✅ Tabla whatsapp_notifications creada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
      ON whatsapp_notifications(scheduled_for, status) 
      WHERE status = 'pending'
    `);

    console.log('✅ Índice para búsqueda de notificaciones pendientes creado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
      ON whatsapp_notifications(reservation_id, status)
    `);

    console.log('✅ Índice para búsqueda por reserva creado');

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

addWhatsAppNotificationsQueue()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
