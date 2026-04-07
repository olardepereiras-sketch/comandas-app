import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAdminCredentials() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔧 Actualizando credenciales de admin...');

    const checkResult = await client.query(
      'SELECT * FROM admin_users WHERE username = $1',
      ['tono77']
    );

    if (checkResult.rows.length > 0) {
      await client.query(
        'UPDATE admin_users SET password = $1 WHERE username = $2',
        ['1500', 'tono77']
      );
      console.log('✅ Credenciales de admin actualizadas');
    } else {
      const oldUserCheck = await client.query(
        'SELECT * FROM admin_users WHERE username = $1',
        ['tono']
      );

      if (oldUserCheck.rows.length > 0) {
        await client.query(
          'UPDATE admin_users SET username = $1, password = $2 WHERE username = $3',
          ['tono77', '1500', 'tono']
        );
        console.log('✅ Usuario admin actualizado de tono a tono77');
      } else {
        await client.query(
          `INSERT INTO admin_users (id, username, password, email, created_at) 
           VALUES ($1, $2, $3, $4, $5)`,
          [`admin-${Date.now()}`, 'tono77', '1500', 'admin@quieromesa.com', new Date()]
        );
        console.log('✅ Usuario admin creado');
      }
    }

    console.log('\n📋 Credenciales actuales:');
    console.log('   Usuario: tono77');
    console.log('   Contraseña: 1500');
    
    console.log('✅ Actualización completada exitosamente');
  } catch (error) {
    console.error('❌ Error en actualización:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminCredentials()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
