import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkReminderNotifications() {
  const client = await pool.connect();

  try {
    console.log('🔍 Consultando notificaciones de recordatorio...\n');

    console.log('📊 TODAS LAS NOTIFICACIONES:');
    console.log('='.repeat(80));
    const allNotifications = await client.query(`
      SELECT 
        id,
        restaurant_id,
        reservation_id,
        recipient_phone,
        recipient_name,
        notification_type,
        scheduled_for,
        status,
        attempts,
        last_attempt_at,
        error_message,
        sent_at,
        created_at
      FROM whatsapp_notifications
      ORDER BY scheduled_for DESC
    `);

    if (allNotifications.rows.length === 0) {
      console.log('❌ No hay notificaciones en la base de datos');
    } else {
      console.log(`✅ Total de notificaciones: ${allNotifications.rows.length}\n`);
      allNotifications.rows.forEach((notif: any, index: number) => {
        console.log(`${index + 1}. ID: ${notif.id}`);
        console.log(`   Tipo: ${notif.notification_type}`);
        console.log(`   Destinatario: ${notif.recipient_name} (${notif.recipient_phone})`);
        console.log(`   Estado: ${notif.status}`);
        console.log(`   Programada para: ${notif.scheduled_for}`);
        console.log(`   Intentos: ${notif.attempts}`);
        if (notif.sent_at) {
          console.log(`   Enviada en: ${notif.sent_at}`);
        }
        if (notif.error_message) {
          console.log(`   Error: ${notif.error_message}`);
        }
        console.log(`   Creada: ${notif.created_at}`);
        console.log('');
      });
    }

    console.log('\n📨 NOTIFICACIONES PENDIENTES:');
    console.log('='.repeat(80));
    const pendingNotifications = await client.query(`
      SELECT 
        id,
        notification_type,
        recipient_name,
        scheduled_for,
        status,
        attempts,
        created_at
      FROM whatsapp_notifications
      WHERE status = 'pending'
      ORDER BY scheduled_for ASC
    `);

    if (pendingNotifications.rows.length === 0) {
      console.log('✅ No hay notificaciones pendientes');
    } else {
      console.log(`⚠️ ${pendingNotifications.rows.length} notificaciones pendientes:\n`);
      pendingNotifications.rows.forEach((notif: any, index: number) => {
        const now = new Date();
        const scheduled = new Date(notif.scheduled_for);
        const isPast = scheduled < now;
        console.log(`${index + 1}. ${notif.notification_type} - ${notif.recipient_name}`);
        console.log(`   Programada: ${notif.scheduled_for} ${isPast ? '⏰ (Ya pasó)' : '🕐 (Futura)'}`);
        console.log(`   Intentos: ${notif.attempts}`);
        console.log('');
      });
    }

    console.log('\n✅ NOTIFICACIONES ENVIADAS:');
    console.log('='.repeat(80));
    const sentNotifications = await client.query(`
      SELECT 
        id,
        notification_type,
        recipient_name,
        scheduled_for,
        sent_at,
        attempts
      FROM whatsapp_notifications
      WHERE status = 'sent'
      ORDER BY sent_at DESC
      LIMIT 10
    `);

    if (sentNotifications.rows.length === 0) {
      console.log('❌ No hay notificaciones enviadas');
    } else {
      console.log(`✅ Últimas ${sentNotifications.rows.length} notificaciones enviadas:\n`);
      sentNotifications.rows.forEach((notif: any, index: number) => {
        console.log(`${index + 1}. ${notif.notification_type} - ${notif.recipient_name}`);
        console.log(`   Programada: ${notif.scheduled_for}`);
        console.log(`   Enviada: ${notif.sent_at}`);
        console.log(`   Intentos: ${notif.attempts}`);
        console.log('');
      });
    }

    console.log('\n❌ NOTIFICACIONES FALLIDAS:');
    console.log('='.repeat(80));
    const failedNotifications = await client.query(`
      SELECT 
        id,
        notification_type,
        recipient_name,
        scheduled_for,
        attempts,
        error_message,
        last_attempt_at
      FROM whatsapp_notifications
      WHERE status = 'failed'
      ORDER BY last_attempt_at DESC
      LIMIT 10
    `);

    if (failedNotifications.rows.length === 0) {
      console.log('✅ No hay notificaciones fallidas');
    } else {
      console.log(`⚠️ ${failedNotifications.rows.length} notificaciones fallidas:\n`);
      failedNotifications.rows.forEach((notif: any, index: number) => {
        console.log(`${index + 1}. ${notif.notification_type} - ${notif.recipient_name}`);
        console.log(`   Programada: ${notif.scheduled_for}`);
        console.log(`   Intentos: ${notif.attempts}`);
        console.log(`   Último intento: ${notif.last_attempt_at}`);
        console.log(`   Error: ${notif.error_message}`);
        console.log('');
      });
    }

    console.log('\n📊 RESUMEN POR TIPO:');
    console.log('='.repeat(80));
    const summary = await client.query(`
      SELECT 
        notification_type,
        status,
        COUNT(*) as count
      FROM whatsapp_notifications
      GROUP BY notification_type, status
      ORDER BY notification_type, status
    `);

    if (summary.rows.length > 0) {
      summary.rows.forEach((row: any) => {
        console.log(`${row.notification_type.padEnd(20)} | ${row.status.padEnd(10)} | ${row.count} notificaciones`);
      });
    }

    console.log('\n📊 RESTAURANTES CON RECORDATORIOS ACTIVOS:');
    console.log('='.repeat(80));
    const restaurantsConfig = await client.query(`
      SELECT 
        id,
        name,
        enable_reminders,
        reminder_24h_enabled,
        reminder_2h_enabled,
        reminder_30m_enabled,
        use_whatsapp_web,
        auto_send_whatsapp
      FROM restaurants
      WHERE enable_reminders = true
    `);

    if (restaurantsConfig.rows.length === 0) {
      console.log('❌ No hay restaurantes con recordatorios activados');
    } else {
      console.log(`✅ ${restaurantsConfig.rows.length} restaurantes con recordatorios:\n`);
      restaurantsConfig.rows.forEach((rest: any, index: number) => {
        console.log(`${index + 1}. ${rest.name} (${rest.id})`);
        console.log(`   Recordatorios: ${rest.enable_reminders ? '✅' : '❌'}`);
        console.log(`   24h: ${rest.reminder_24h_enabled ? '✅' : '❌'} | 2h: ${rest.reminder_2h_enabled ? '✅' : '❌'} | 30m: ${rest.reminder_30m_enabled ? '✅' : '❌'}`);
        console.log(`   WhatsApp Web: ${rest.use_whatsapp_web ? '✅' : '❌'} | Auto envío: ${rest.auto_send_whatsapp ? '✅' : '❌'}`);
        console.log('');
      });
    }

    console.log('\n📅 ÚLTIMAS RESERVAS CREADAS:');
    console.log('='.repeat(80));
    const recentReservations = await client.query(`
      SELECT 
        id,
        client_name,
        date,
        time,
        status,
        created_at
      FROM reservations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentReservations.rows.length > 0) {
      console.log(`✅ Últimas ${recentReservations.rows.length} reservas:\n`);
      recentReservations.rows.forEach((res: any, index: number) => {
        console.log(`${index + 1}. ${res.client_name} - ${res.date} ${res.time.hour}:${String(res.time.minute).padStart(2, '0')}`);
        console.log(`   Estado: ${res.status}`);
        console.log(`   Creada: ${res.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkReminderNotifications()
  .then(() => {
    console.log('\n✅ Consulta completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
