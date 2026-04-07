import { Pool } from 'pg';

console.log('🔧 Habilitando recordatorios para O Lar de Pereiras...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function enableReminders() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida\n');

    console.log('📊 Estado actual:');
    const currentConfig = await client.query(`
      SELECT name, 
             reminder1_enabled, reminder1_hours,
             reminder2_enabled, reminder2_minutes,
             use_whatsapp_web, auto_send_whatsapp
      FROM restaurants
      WHERE name LIKE '%Pereiras%'
    `);

    if (currentConfig.rows.length === 0) {
      console.log('❌ No se encontró el restaurante O Lar de Pereiras');
      return;
    }

    const rest = currentConfig.rows[0];
    console.log(`  Restaurante: ${rest.name}`);
    console.log(`  Recordatorio 1: ${rest.reminder1_enabled ? '✓' : '✗'} (${rest.reminder1_hours}h)`);
    console.log(`  Recordatorio 2: ${rest.reminder2_enabled ? '✓' : '✗'} (${rest.reminder2_minutes}m)`);
    console.log(`  WhatsApp Web: ${rest.use_whatsapp_web ? '✓' : '✗'}`);
    console.log(`  Auto-envío: ${rest.auto_send_whatsapp ? '✓' : '✗'}`);

    console.log('\n🔧 Actualizando configuración...');
    await client.query(`
      UPDATE restaurants 
      SET reminder1_enabled = true,
          reminder1_hours = 2,
          reminder2_enabled = true,
          reminder2_minutes = 60,
          use_whatsapp_web = true,
          auto_send_whatsapp = true
      WHERE name LIKE '%Pereiras%'
    `);

    console.log('\n✅ Configuración actualizada\n');

    console.log('📊 Nueva configuración:');
    const newConfig = await client.query(`
      SELECT name, 
             reminder1_enabled, reminder1_hours,
             reminder2_enabled, reminder2_minutes,
             use_whatsapp_web, auto_send_whatsapp
      FROM restaurants
      WHERE name LIKE '%Pereiras%'
    `);

    const updatedRest = newConfig.rows[0];
    console.log(`  Restaurante: ${updatedRest.name}`);
    console.log(`  Recordatorio 1: ${updatedRest.reminder1_enabled ? '✓' : '✗'} (${updatedRest.reminder1_hours}h)`);
    console.log(`  Recordatorio 2: ${updatedRest.reminder2_enabled ? '✓' : '✗'} (${updatedRest.reminder2_minutes}m)`);
    console.log(`  WhatsApp Web: ${updatedRest.use_whatsapp_web ? '✓' : '✗'}`);
    console.log(`  Auto-envío: ${updatedRest.auto_send_whatsapp ? '✓' : '✗'}`);

    console.log('\n✅ Ahora las nuevas reservas crearán recordatorios automáticamente');

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

enableReminders().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
