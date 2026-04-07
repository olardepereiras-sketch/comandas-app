import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWhatsAppNotificationsConstraint() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔧 Eliminando constraint antiguo...');

    await client.query(`
      ALTER TABLE whatsapp_notifications 
      DROP CONSTRAINT IF EXISTS whatsapp_notifications_notification_type_check;
    `);

    console.log('✅ Constraint antiguo eliminado');

    await client.query(`
      ALTER TABLE whatsapp_notifications 
      DROP CONSTRAINT IF EXISTS whatsapp_notifications_status_check;
    `);

    console.log('✅ Constraint de status eliminado');

    await client.query(`
      ALTER TABLE whatsapp_notifications 
      ADD CONSTRAINT whatsapp_notifications_status_check 
      CHECK (status IN ('pending', 'sent', 'failed'));
    `);

    console.log('✅ Constraint de status recreado');

    const columnsResult = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_notifications'
      AND column_name = 'notification_type'
    `);

    console.log('\n📋 Columna notification_type:', columnsResult.rows[0]);

    const constraintsResult = await client.query(`
      SELECT 
        con.conname as constraint_name,
        pg_get_constraintdef(con.oid) as constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'whatsapp_notifications'
      AND con.contype = 'c'
    `);

    console.log('\n📋 Constraints actuales:');
    constraintsResult.rows.forEach((row: any) => {
      console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`);
    });

    console.log('\n✅ Migración completada. Ahora notification_type acepta cualquier valor TEXT.');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

fixWhatsAppNotificationsConstraint()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
