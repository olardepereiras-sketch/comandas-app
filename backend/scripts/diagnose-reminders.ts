import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseReminders() {
  const client = await pool.connect();

  try {
    console.log('🔍 Diagnóstico del Sistema de Recordatorios\n');
    console.log('='.repeat(60));

    console.log('\n📊 1. Verificando configuración de restaurantes:');
    const restaurantsResult = await client.query(`
      SELECT 
        id, 
        name,
        reminder1_enabled,
        reminder1_hours,
        reminder2_enabled,
        reminder2_minutes,
        use_whatsapp_web,
        auto_send_whatsapp
      FROM restaurants
      WHERE (reminder1_enabled = true OR reminder2_enabled = true)
    `);

    if (restaurantsResult.rows.length === 0) {
      console.log('⚠️  No hay restaurantes con recordatorios habilitados');
    } else {
      console.log(`✅ ${restaurantsResult.rows.length} restaurante(s) con recordatorios habilitados:`);
      restaurantsResult.rows.forEach((r: any) => {
        console.log(`\n   - ${r.name} (${r.id})`);
        console.log(`     • Recordatorio 1: ${r.reminder1_enabled ? `✓ (${r.reminder1_hours}h)` : '✗'}`);
        console.log(`     • Recordatorio 2: ${r.reminder2_enabled ? `✓ (${r.reminder2_minutes}m)` : '✗'}`);
        console.log(`     • WhatsApp Web: ${r.use_whatsapp_web ? '✓' : '✗'}`);
        console.log(`     • Envío automático: ${r.auto_send_whatsapp ? '✓' : '✗'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📨 2. Verificando tabla whatsapp_notifications:');
    
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      )
    `);

    if (!tableExistsResult.rows[0].exists) {
      console.log('❌ La tabla whatsapp_notifications NO existe');
      console.log('   Ejecuta: bun backend/db/add-whatsapp-notifications-queue.ts');
    } else {
      console.log('✅ Tabla whatsapp_notifications existe');

      const statsResult = await client.query(`
        SELECT 
          status,
          notification_type,
          COUNT(*) as total
        FROM whatsapp_notifications
        GROUP BY status, notification_type
        ORDER BY status, notification_type
      `);

      if (statsResult.rows.length === 0) {
        console.log('   ℹ️  No hay notificaciones en la cola');
      } else {
        console.log('\n   Estadísticas por estado y tipo:');
        statsResult.rows.forEach((row: any) => {
          console.log(`   • ${row.status.padEnd(10)} - ${row.notification_type.padEnd(15)} : ${row.total}`);
        });
      }

      console.log('\n   Notificaciones pendientes próximas:');
      const pendingResult = await client.query(`
        SELECT 
          id,
          notification_type,
          recipient_name,
          scheduled_for,
          attempts
        FROM whatsapp_notifications
        WHERE status = 'pending'
        ORDER BY scheduled_for ASC
        LIMIT 5
      `);

      if (pendingResult.rows.length === 0) {
        console.log('   ℹ️  No hay notificaciones pendientes');
      } else {
        pendingResult.rows.forEach((row: any) => {
          const scheduledDate = new Date(row.scheduled_for);
          const now = new Date();
          const minutesUntil = Math.floor((scheduledDate.getTime() - now.getTime()) / (1000 * 60));
          const timeUntil = minutesUntil > 0 
            ? `en ${minutesUntil} minutos` 
            : `hace ${Math.abs(minutesUntil)} minutos (atrasado)`;
          
          console.log(`   • ${row.notification_type.padEnd(15)} para ${row.recipient_name} - ${timeUntil}`);
          console.log(`     Programado: ${scheduledDate.toISOString()}, Intentos: ${row.attempts}`);
        });
      }

      console.log('\n   Notificaciones fallidas recientes:');
      const failedResult = await client.query(`
        SELECT 
          id,
          notification_type,
          recipient_name,
          error_message,
          attempts,
          last_attempt_at
        FROM whatsapp_notifications
        WHERE status = 'failed'
        ORDER BY last_attempt_at DESC
        LIMIT 5
      `);

      if (failedResult.rows.length === 0) {
        console.log('   ✅ No hay notificaciones fallidas');
      } else {
        failedResult.rows.forEach((row: any) => {
          console.log(`   • ${row.notification_type} para ${row.recipient_name}`);
          console.log(`     Error: ${row.error_message}`);
          console.log(`     Intentos: ${row.attempts}, Último intento: ${row.last_attempt_at}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🔍 3. Verificando reservas futuras que deberían tener recordatorios:');
    
    const futureReservationsResult = await client.query(`
      SELECT 
        r.id,
        r.date,
        r.time,
        r.client_name,
        rest.name as restaurant_name,
        rest.reminder1_enabled,
        rest.reminder2_enabled,
        rest.use_whatsapp_web,
        rest.auto_send_whatsapp,
        (SELECT COUNT(*) FROM whatsapp_notifications WHERE reservation_id = r.id) as notifications_count
      FROM reservations r
      JOIN restaurants rest ON r.restaurant_id = rest.id
      WHERE r.date >= CURRENT_DATE
      AND r.status = 'confirmed'
      AND (rest.reminder1_enabled = true OR rest.reminder2_enabled = true)
      AND rest.use_whatsapp_web = true
      AND rest.auto_send_whatsapp = true
      ORDER BY r.date ASC, r.time ASC
      LIMIT 10
    `);

    if (futureReservationsResult.rows.length === 0) {
      console.log('ℹ️  No hay reservas futuras con recordatorios habilitados');
    } else {
      console.log(`Encontradas ${futureReservationsResult.rows.length} reserva(s) futuras:`);
      futureReservationsResult.rows.forEach((row: any) => {
        const timeObj = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
        const timeStr = `${String(timeObj.hour).padStart(2, '0')}:${String(timeObj.minute).padStart(2, '0')}`;
        const notifStatus = row.notifications_count > 0 
          ? `✅ ${row.notifications_count} recordatorio(s)` 
          : '⚠️  Sin recordatorios';
        
        console.log(`\n   • ${row.client_name} - ${row.date} ${timeStr}`);
        console.log(`     Restaurante: ${row.restaurant_name}`);
        console.log(`     Estado: ${notifStatus}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseReminders()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
