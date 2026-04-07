import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWhatsAppNotificationsTable() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔧 Verificando columna updated_at en whatsapp_notifications...');

    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications' 
      AND column_name = 'updated_at'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📋 Agregando columna updated_at...');
      await client.query(`
        ALTER TABLE whatsapp_notifications 
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      `);
      console.log('✅ Columna updated_at agregada exitosamente');
    } else {
      console.log('✅ Columna updated_at ya existe');
    }

    console.log('🔧 Creando trigger para actualizar updated_at automáticamente...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_whatsapp_notifications_updated_at ON whatsapp_notifications;
    `);

    await client.query(`
      CREATE TRIGGER update_whatsapp_notifications_updated_at 
      BEFORE UPDATE ON whatsapp_notifications 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Trigger creado exitosamente');
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixWhatsAppNotificationsTable()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
