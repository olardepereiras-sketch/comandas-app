import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function fixWhatsAppConfig() {
  try {
    console.log('🔧 Activando configuración de WhatsApp para todos los restaurantes...\n');

    const result = await pool.query(
      `UPDATE restaurants 
       SET auto_send_whatsapp = true,
           use_whatsapp_web = true,
           updated_at = NOW()
       WHERE auto_send_whatsapp = false OR use_whatsapp_web = false
       RETURNING id, name, slug, auto_send_whatsapp, use_whatsapp_web`
    );

    if (result.rows.length === 0) {
      console.log('✅ Todos los restaurantes ya tienen la configuración correcta');
    } else {
      console.log(`✅ Actualizado ${result.rows.length} restaurante(s):\n`);
      
      for (const restaurant of result.rows) {
        console.log(`   🏪 ${restaurant.name}`);
        console.log(`      Auto Send: ${restaurant.auto_send_whatsapp ? '✅' : '❌'}`);
        console.log(`      WhatsApp Web: ${restaurant.use_whatsapp_web ? '✅' : '❌'}`);
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Configuración actualizada correctamente');
    console.log('📱 Las notificaciones de WhatsApp ahora se enviarán automáticamente');
    console.log('');
    console.log('⚠️  IMPORTANTE: Asegúrate de que WhatsApp Web esté conectado');
    console.log('   Ve a: https://quieromesa.com/restaurant/config-pro');
    console.log('   Y escanea el código QR si no está conectado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixWhatsAppConfig();
}
