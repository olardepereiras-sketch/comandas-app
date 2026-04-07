import { createClient } from '@libsql/client';

console.log('🌱 Iniciando seed de datos LIMPIO (sin ejemplos)...');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ Error: Faltan variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = createClient({
  url,
  authToken,
});

async function seed() {
  try {
    console.log('✅ Conexión establecida con Turso');

    const now = Date.now();

    console.log('🔄 Insertando usuario administrador...');
    await db.execute({
      sql: `INSERT OR IGNORE INTO admin_users 
            (id, username, password, email, last_ip, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'admin_tono',
        'tono',
        '1234',
        'info@olardepereiras.com',
        null,
        now,
        now,
      ],
    });
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
  }
}

seed();
