import { Pool } from 'pg';

console.log('🔄 Verificando y corrigiendo sistema completo de recordatorios...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixRemindersSystem() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida con PostgreSQL\n');

    console.log('📋 1. Verificando campos actuales en tabla restaurants...');
    const currentColumns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name LIKE '%reminder%'
      ORDER BY column_name;
    `);

    console.log('Campos existentes:');
    currentColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

    console.log('\n🔧 2. Asegurando que existen los campos correctos...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24,
      ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60;
    `);
    console.log('✅ Campos verificados/creados');

    console.log('\n📊 3. Verificando configuración actual de restaurantes...');
    const restaurants = await client.query(`
      SELECT id, name, 
             reminder1_enabled, reminder1_hours,
             reminder2_enabled, reminder2_minutes,
             use_whatsapp_web, auto_send_whatsapp
      FROM restaurants
      ORDER BY name;
    `);

    console.log(`\nEncontrados ${restaurants.rows.length} restaurante(s):\n`);
    restaurants.rows.forEach((rest: any) => {
      console.log(`  📍 ${rest.name} (${rest.id})`);
      console.log(`     - Recordatorio 1: ${rest.reminder1_enabled ? '✓' : '✗'} (${rest.reminder1_hours}h)`);
      console.log(`     - Recordatorio 2: ${rest.reminder2_enabled ? '✓' : '✗'} (${rest.reminder2_minutes}m)`);
      console.log(`     - WhatsApp Web: ${rest.use_whatsapp_web ? '✓' : '✗'}`);
      console.log(`     - Auto-envío: ${rest.auto_send_whatsapp ? '✓' : '✗'}`);
      console.log('');
    });

    console.log('📨 4. Verificando tabla whatsapp_notifications...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      );
    `);

    if (tableExists.rows[0].exists) {
      console.log('✅ Tabla whatsapp_notifications existe');
      
      const notifications = await client.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
               COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
               COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM whatsapp_notifications;
      `);
      
      const stats = notifications.rows[0];
      console.log(`   Total: ${stats.total}, Pendientes: ${stats.pending}, Enviadas: ${stats.sent}, Fallidas: ${stats.failed}`);
    } else {
      console.log('⚠️ Tabla whatsapp_notifications NO existe - creándola...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_notifications (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          reservation_id TEXT NOT NULL,
          recipient_phone TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          scheduled_for TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_attempt_at TIMESTAMP,
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        );
      `);
      console.log('✅ Tabla whatsapp_notifications creada');
    }

    console.log('\n🔍 5. Verificando reservas futuras sin recordatorios...');
    const futureReservations = await client.query(`
      SELECT r.id, r.client_name, r.date, r.time, r.restaurant_id, rest.name as restaurant_name,
             rest.reminder1_enabled, rest.reminder2_enabled, 
             rest.use_whatsapp_web, rest.auto_send_whatsapp
      FROM reservations r
      JOIN restaurants rest ON r.restaurant_id = rest.id
      WHERE r.date >= CURRENT_DATE
        AND r.status = 'confirmed'
        AND (rest.reminder1_enabled = true OR rest.reminder2_enabled = true)
        AND rest.use_whatsapp_web = true
        AND rest.auto_send_whatsapp = true
      ORDER BY r.date, r.time;
    `);

    console.log(`Encontradas ${futureReservations.rows.length} reserva(s) que deberían tener recordatorios:\n`);
    
    for (const res of futureReservations.rows) {
      const notificationsCount = await client.query(
        'SELECT COUNT(*) as total FROM whatsapp_notifications WHERE reservation_id = $1',
        [res.id]
      );
      
      const count = notificationsCount.rows[0].total;
      const time = typeof res.time === 'string' ? JSON.parse(res.time) : res.time;
      const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
      
      console.log(`  ${count === 0 ? '❌' : '✅'} ${res.client_name} - ${res.date} ${timeStr}`);
      console.log(`     Restaurante: ${res.restaurant_name}`);
      console.log(`     Recordatorios: ${count}`);
      console.log('');
    }

    console.log('\n✅ Diagnóstico completado');
    console.log('\n📋 RESUMEN:');
    console.log('  - Los campos correctos son: reminder1_enabled, reminder1_hours, reminder2_enabled, reminder2_minutes');
    console.log('  - Para que se creen recordatorios automáticamente al crear una reserva:');
    console.log('    1. El restaurante debe tener reminder1_enabled=true O reminder2_enabled=true');
    console.log('    2. El restaurante debe tener use_whatsapp_web=true');
    console.log('    3. El restaurante debe tener auto_send_whatsapp=true');
    console.log('  - Si las reservas existentes no tienen recordatorios, se crearán nuevos en las próximas reservas');

  } catch (error: any) {
    console.error('❌ Error:', error);
    console.error('Detalle:', error.detail || error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRemindersSystem().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
