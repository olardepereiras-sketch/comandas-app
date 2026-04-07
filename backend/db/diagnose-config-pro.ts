import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseConfigPro() {
  console.log('🔍 DIAGNÓSTICO DE CONFIG PRO');
  console.log('=' .repeat(60));

  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        slug,
        enable_email_notifications,
        notification_email,
        min_modify_cancel_minutes,
        reminder1_enabled,
        reminder1_hours,
        reminder2_enabled,
        reminder2_minutes,
        advance_booking_days,
        table_rotation_time,
        min_booking_advance_minutes,
        use_whatsapp_web,
        auto_send_whatsapp,
        notification_phones,
        whatsapp_custom_message,
        custom_links
      FROM restaurants
      WHERE slug = 'o-lar-de-pereiras'
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró el restaurante');
      return;
    }

    const restaurant = result.rows[0];
    
    console.log('\n📊 DATOS EN BASE DE DATOS:');
    console.log('-'.repeat(60));
    console.log(`ID: ${restaurant.id}`);
    console.log(`Nombre: ${restaurant.name}`);
    console.log(`Slug: ${restaurant.slug}`);
    console.log('\n📧 NOTIFICACIONES EMAIL:');
    console.log(`  enable_email_notifications: ${restaurant.enable_email_notifications}`);
    console.log(`  notification_email: ${restaurant.notification_email}`);
    
    console.log('\n⏰ RECORDATORIOS:');
    console.log(`  reminder1_enabled: ${restaurant.reminder1_enabled}`);
    console.log(`  reminder1_hours: ${restaurant.reminder1_hours}`);
    console.log(`  reminder2_enabled: ${restaurant.reminder2_enabled}`);
    console.log(`  reminder2_minutes: ${restaurant.reminder2_minutes}`);
    
    console.log('\n⚙️ CONFIGURACIÓN DE RESERVAS:');
    console.log(`  min_modify_cancel_minutes: ${restaurant.min_modify_cancel_minutes}`);
    console.log(`  advance_booking_days: ${restaurant.advance_booking_days}`);
    console.log(`  table_rotation_time: ${restaurant.table_rotation_time}`);
    console.log(`  min_booking_advance_minutes: ${restaurant.min_booking_advance_minutes}`);
    
    console.log('\n📱 WHATSAPP:');
    console.log(`  use_whatsapp_web: ${restaurant.use_whatsapp_web}`);
    console.log(`  auto_send_whatsapp: ${restaurant.auto_send_whatsapp}`);
    console.log(`  notification_phones: ${restaurant.notification_phones}`);
    console.log(`  whatsapp_custom_message: ${restaurant.whatsapp_custom_message}`);
    
    console.log('\n🔗 ENLACES:');
    console.log(`  custom_links: ${restaurant.custom_links}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseConfigPro();
