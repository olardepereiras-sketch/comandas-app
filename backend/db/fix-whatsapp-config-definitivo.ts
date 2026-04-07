import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixWhatsAppConfig() {
  try {
    console.log('🔧 ACTIVANDO NOTIFICACIONES DE WHATSAPP AUTOMÁTICAS\n');
    console.log('=' .repeat(70));

    const result = await pool.query(
      `UPDATE restaurants 
       SET 
         auto_send_whatsapp = true,
         use_whatsapp_web = true,
         updated_at = NOW()
       WHERE id IN (
         SELECT id FROM restaurants ORDER BY created_at DESC LIMIT 10
       )
       RETURNING id, name, auto_send_whatsapp, use_whatsapp_web`
    );

    if (result.rows.length === 0) {
      console.log('❌ No se encontraron restaurantes para actualizar');
      return;
    }

    console.log(`\n✅ Configuración actualizada para ${result.rows.length} restaurante(s):\n`);

    for (const restaurant of result.rows) {
      console.log(`🏪 ${restaurant.name} (${restaurant.id})`);
      console.log(`   ├─ auto_send_whatsapp: ${restaurant.auto_send_whatsapp ? '✅ ACTIVADO' : '❌'}`);
      console.log(`   └─ use_whatsapp_web: ${restaurant.use_whatsapp_web ? '✅ ACTIVADO' : '❌'}`);
      console.log('');
    }

    console.log('=' .repeat(70));
    console.log('\n✅ CONFIGURACIÓN COMPLETADA');
    console.log('\n💡 Las notificaciones de WhatsApp ahora se enviarán automáticamente');
    console.log('   cuando se cree una reserva desde cualquier fuente.\n');

  } catch (error) {
    console.error('❌ Error al actualizar configuración:', error);
  } finally {
    await pool.end();
  }
}

fixWhatsAppConfig();
