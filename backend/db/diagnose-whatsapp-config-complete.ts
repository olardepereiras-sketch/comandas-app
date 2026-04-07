import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function diagnoseWhatsAppConfig() {
  try {
    console.log('🔍 DIAGNÓSTICO DE CONFIGURACIÓN DE WHATSAPP\n');
    console.log('=' .repeat(70));

    const restaurantsResult = await pool.query(
      `SELECT 
        id, 
        name, 
        auto_send_whatsapp, 
        use_whatsapp_web,
        notification_phones,
        whatsapp_custom_message,
        reminder1_enabled,
        reminder1_hours,
        reminder2_enabled,
        reminder2_minutes
      FROM restaurants 
      ORDER BY created_at DESC`
    );

    if (restaurantsResult.rows.length === 0) {
      console.log('❌ No se encontraron restaurantes en la base de datos');
      return;
    }

    console.log(`\n📊 Total de restaurantes: ${restaurantsResult.rows.length}\n`);

    for (const restaurant of restaurantsResult.rows) {
      console.log('─'.repeat(70));
      console.log(`🏪 Restaurante: ${restaurant.name}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log('');
      console.log('   📱 CONFIGURACIÓN WHATSAPP:');
      console.log(`   ├─ auto_send_whatsapp: ${restaurant.auto_send_whatsapp ? '✅ ACTIVADO' : '❌ DESACTIVADO'}`);
      console.log(`   ├─ use_whatsapp_web: ${restaurant.use_whatsapp_web ? '✅ ACTIVADO' : '❌ DESACTIVADO'}`);
      console.log(`   ├─ notification_phones: ${restaurant.notification_phones || 'No configurado'}`);
      console.log(`   └─ whatsapp_custom_message: ${restaurant.whatsapp_custom_message ? 'Configurado' : 'No configurado'}`);
      console.log('');
      console.log('   🔔 RECORDATORIOS:');
      console.log(`   ├─ Recordatorio 1: ${restaurant.reminder1_enabled ? `✅ ${restaurant.reminder1_hours}h antes` : '❌ Desactivado'}`);
      console.log(`   └─ Recordatorio 2: ${restaurant.reminder2_enabled ? `✅ ${restaurant.reminder2_minutes}m antes` : '❌ Desactivado'}`);
      console.log('');

      const conditionsOk = restaurant.auto_send_whatsapp && restaurant.use_whatsapp_web;
      if (conditionsOk) {
        console.log('   ✅ CONFIGURACIÓN CORRECTA - Las notificaciones se enviarán automáticamente');
      } else {
        console.log('   ⚠️  PROBLEMA DETECTADO:');
        if (!restaurant.auto_send_whatsapp) {
          console.log('      ❌ auto_send_whatsapp está DESACTIVADO');
          console.log('         → Necesita activarse en Config Pro del restaurante');
        }
        if (!restaurant.use_whatsapp_web) {
          console.log('      ❌ use_whatsapp_web está DESACTIVADO');
          console.log('         → Necesita activarse en Config Pro del restaurante');
        }
      }
    }

    console.log('─'.repeat(70));
    console.log('');

    console.log('🔍 VERIFICANDO NOTIFICACIONES PROGRAMADAS...\n');
    const notificationsResult = await pool.query(
      `SELECT 
        id,
        restaurant_id,
        reservation_id,
        recipient_phone,
        notification_type,
        status,
        scheduled_for,
        attempts,
        error_message
      FROM whatsapp_notifications
      WHERE status = 'pending'
      ORDER BY scheduled_for ASC
      LIMIT 20`
    );

    if (notificationsResult.rows.length === 0) {
      console.log('   ℹ️  No hay notificaciones pendientes en la cola');
    } else {
      console.log(`   📨 ${notificationsResult.rows.length} notificaciones pendientes:\n`);
      for (const notif of notificationsResult.rows) {
        const scheduledDate = new Date(notif.scheduled_for);
        const now = new Date();
        const isPast = scheduledDate < now;
        
        console.log(`   ${isPast ? '🔴' : '🟢'} ${notif.notification_type}`);
        console.log(`      📞 ${notif.recipient_phone}`);
        console.log(`      📅 Programado: ${scheduledDate.toLocaleString('es-ES')}`);
        console.log(`      📊 Estado: ${notif.status} (${notif.attempts} intentos)`);
        if (notif.error_message) {
          console.log(`      ⚠️  Error: ${notif.error_message}`);
        }
        console.log('');
      }
    }

    console.log('=' .repeat(70));
    console.log('\n💡 RECOMENDACIONES:\n');
    console.log('1. Para activar notificaciones automáticas:');
    console.log('   - Ir a Config Pro del restaurante');
    console.log('   - Activar "Enviar WhatsApp automáticamente"');
    console.log('   - Activar "Usar WhatsApp Web"');
    console.log('');
    console.log('2. Si ya está activado pero no funciona:');
    console.log('   - Verificar que la sesión de WhatsApp Web esté conectada');
    console.log('   - Revisar los logs del servidor para errores específicos');
    console.log('');

  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseWhatsAppConfig();
