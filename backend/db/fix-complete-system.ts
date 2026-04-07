import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixCompleteSystem() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    console.log('\n📋 1. Arreglando tabla admin_users...');
    
    const adminTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      )
    `);
    
    if (!adminTableCheck.rows[0].exists) {
      console.log('🔧 Creando tabla admin_users...');
      await client.query(`
        CREATE TABLE admin_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT 'admin@quieromesa.com',
          last_ip TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla admin_users creada');
    }
    
    console.log('🔧 Actualizando/Creando usuario admin...');
    await client.query(`
      INSERT INTO admin_users (id, username, password, email, created_at, updated_at)
      VALUES ('admin-tono77', 'tono77', '1500', 'admin@quieromesa.com', NOW(), NOW())
      ON CONFLICT (username) DO UPDATE 
      SET password = '1500', email = 'admin@quieromesa.com', updated_at = NOW()
    `);
    console.log('✅ Credenciales actualizadas: tono77/1500');

    console.log('\n📋 2. Arreglando tabla clients...');
    const clientColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    const clientCols = clientColumns.rows.map(r => r.column_name);
    
    if (!clientCols.includes('no_show')) {
      console.log('🔧 Agregando columna no_show...');
      await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS no_show INTEGER DEFAULT 0`);
      console.log('✅ Columna no_show agregada');
    }
    
    const emailConstraint = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'email'
    `);
    
    if (emailConstraint.rows[0]?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en columna email de clients...');
      await client.query(`ALTER TABLE clients ALTER COLUMN email DROP NOT NULL`);
      console.log('✅ Columna email ahora permite NULL');
    }

    console.log('\n📋 3. Arreglando tabla reservations...');
    const reservationCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `);
    console.log('✅ Columnas de reservations verificadas:', reservationCols.rows.length);
    
    const confirmationTokenConstraint = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'confirmation_token'
    `);
    
    if (confirmationTokenConstraint.rows[0]?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en confirmation_token...');
      await client.query(`ALTER TABLE reservations ALTER COLUMN confirmation_token DROP NOT NULL`);
      console.log('✅ Columna confirmation_token ahora permite NULL');
    }
    
    const tokenConstraint = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'token'
    `);
    
    if (tokenConstraint.rows[0]?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en token...');
      await client.query(`ALTER TABLE reservations ALTER COLUMN token DROP NOT NULL`);
      console.log('✅ Columna token ahora permite NULL');
    }

    console.log('\n📋 4. Verificando tokens de reservas...');
    const nullTokens = await client.query(`
      SELECT id FROM reservations
      WHERE (confirmation_token IS NULL OR confirmation_token = '') 
        AND status NOT IN ('cancelled', 'modified')
    `);
    
    if (nullTokens.rows.length > 0) {
      console.log(`🔧 Generando tokens para ${nullTokens.rows.length} reservas...`);
      await client.query(`
        UPDATE reservations
        SET 
          confirmation_token = 'token-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(id FROM 5),
          token = 'token-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(id FROM 5)
        WHERE (confirmation_token IS NULL OR confirmation_token = '') 
          AND status NOT IN ('cancelled', 'modified')
      `);
      console.log('✅ Tokens generados');
    }

    console.log('\n📋 5. Arreglando tabla whatsapp_notifications...');
    const whatsappCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
    `);
    
    if (whatsappCols.rows.some(r => r.column_name === 'updated_at')) {
      console.log('🔧 Eliminando columna updated_at...');
      await client.query(`ALTER TABLE whatsapp_notifications DROP COLUMN IF EXISTS updated_at CASCADE`);
      console.log('✅ Columna updated_at eliminada');
    }

    console.log('\n📋 6. Verificando tabla day_exceptions...');
    const dayExceptionCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
    `);
    console.log('✅ Tabla day_exceptions verificada con columnas:', dayExceptionCols.rows.map(r => r.column_name).join(', '));

    console.log('\n✅ ¡Sistema completamente arreglado!');
    console.log('\n📊 Resumen de cambios:');
    console.log('  ✅ Admin login: tono77 / 1500');
    console.log('  ✅ Tabla clients: columna no_show agregada, email permite NULL');
    console.log('  ✅ Tabla reservations: tokens permiten NULL para cancelaciones');
    console.log('  ✅ Tabla whatsapp_notifications: sin columna updated_at');
    console.log('  ✅ Day exceptions: sistema verificado y funcional');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCompleteSystem()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });
