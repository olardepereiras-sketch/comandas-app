import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function diagnoseWhatsAppConfig() {
  try {
    console.log('🔍 Diagnosticando configuración de WhatsApp...\n');

    const result = await pool.query(
      `SELECT id, name, slug, auto_send_whatsapp, use_whatsapp_web, 
              whatsapp_custom_message, notification_phones
       FROM restaurants
       ORDER BY created_at DESC`
    );

    console.log(`📊 Restaurantes encontrados: ${result.rows.length}\n`);

    for (const restaurant of result.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🏪 ${restaurant.name} (${restaurant.slug})`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   ✉️  Auto Send WhatsApp: ${restaurant.auto_send_whatsapp ? '✅ Activado' : '❌ Desactivado'}`);
      console.log(`   🌐 Use WhatsApp Web: ${restaurant.use_whatsapp_web ? '✅ Activado' : '❌ Desactivado'}`);
      console.log(`   📱 Notification Phones: ${restaurant.notification_phones ? JSON.stringify(restaurant.notification_phones) : 'No configurado'}`);
      console.log(`   💬 Custom Message: ${restaurant.whatsapp_custom_message ? 'Configurado' : 'No configurado'}`);
      
      if (!restaurant.auto_send_whatsapp || !restaurant.use_whatsapp_web) {
        console.log(`   ⚠️  PROBLEMA: Las notificaciones automáticas NO funcionarán`);
        console.log(`      Necesita activar ambas opciones en Configuración Pro`);
      } else {
        console.log(`   ✅ Configuración correcta para notificaciones automáticas`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Solución:');
    console.log('   1. Ve a https://quieromesa.com/restaurant/config-pro');
    console.log('   2. Activa "Enviar WhatsApp automáticamente al confirmar reserva"');
    console.log('   3. Activa "Usar WhatsApp Web" (debe estar conectado)');
    console.log('   4. Configura los teléfonos de notificación si aún no lo has hecho\n');

    console.log('🔧 ¿Quieres activar auto_send_whatsapp y use_whatsapp_web AHORA?');
    console.log('   Ejecuta: node -e "require(\'./backend/db/fix-whatsapp-config.ts\').fixWhatsAppConfig()"');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

diagnoseWhatsAppConfig();
