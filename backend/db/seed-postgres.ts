import { Pool } from 'pg';

console.log('🌱 Iniciando seed de PostgreSQL (sistema limpio)...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('🔄 Insertando usuario administrador...');
    await client.query(
      `INSERT INTO admin_users 
       (id, username, password, email, last_ip, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (username) DO NOTHING`,
      [
        'admin_tono',
        'tono',
        '1234',
        'info@olardepereiras.com',
        null,
      ]
    );
    console.log('  ✓ Usuario administrador creado: tono / 1234');
    console.log('  ✉️ Email 2FA: info@olardepereiras.com');

    console.log('\n✅ Seed completado exitosamente');
    console.log('🎉 Base de datos lista - Sistema limpio sin datos de ejemplo');
    console.log('\n🔑 Credenciales de administrador:');
    console.log('   Usuario: tono');
    console.log('   Contraseña: 1234');
    console.log('   Email: info@olardepereiras.com');
    console.log('\n🔐 El administrador puede cambiar su contraseña desde el panel');
    console.log('   (requerirá código de verificación por email)');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
