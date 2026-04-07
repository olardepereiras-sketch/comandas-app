import 'dotenv/config';
import { Pool } from 'pg';

async function testProvinces() {
  console.log('🧪 Probando conexión a PostgreSQL...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada ✓' : 'NO CONFIGURADA ✗');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('\n📊 Consultando provincias...');
    const result = await pool.query('SELECT * FROM provinces ORDER BY name');
    
    console.log(`\n✅ Resultado: ${result.rows.length} provincias encontradas`);
    console.log('Provincias:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (ID: ${row.id})`);
    });

    console.log('\n📊 Consultando ciudades...');
    const citiesResult = await pool.query('SELECT * FROM cities ORDER BY name');
    console.log(`✅ Resultado: ${citiesResult.rows.length} ciudades encontradas`);
    
    if (citiesResult.rows.length > 0) {
      console.log('Ciudades:');
      citiesResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.name} (Provincia ID: ${row.province_id})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

testProvinces();
