import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

async function verifyAndCreateTable() {
  const pool = new Pool({ connectionString });

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión establecida');

    console.log('\n📋 Verificando tabla province_cuisine_types...');
    
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'province_cuisine_types'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabla province_cuisine_types no existe. Creando...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS province_cuisine_types (
          id TEXT PRIMARY KEY,
          province_id TEXT NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
          cuisine_type_id TEXT NOT NULL REFERENCES cuisine_types(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(province_id, cuisine_type_id)
        );
      `);
      
      console.log('✅ Tabla province_cuisine_types creada');
    } else {
      console.log('✅ Tabla province_cuisine_types ya existe');
    }

    console.log('\n📊 Verificando registros existentes...');
    const result = await pool.query('SELECT COUNT(*) as count FROM province_cuisine_types');
    console.log(`   ${result.rows[0].count} asignaciones encontradas`);

    console.log('\n✅ Verificación completada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyAndCreateTable();
