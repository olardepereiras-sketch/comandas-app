import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function verifyRatingSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICANDO ESQUEMA DE VALORACIONES\n');
    
    // Verificar rating_criteria
    console.log('📋 Verificando tabla rating_criteria...');
    const criteriaResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rating_criteria'
      ORDER BY ordinal_position;
    `);
    console.log('Columnas encontradas:', criteriaResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    const criteriaCount = await client.query('SELECT COUNT(*) FROM rating_criteria');
    console.log(`✅ ${criteriaCount.rows[0].count} criterios en la base de datos\n`);
    
    // Verificar no_show_rules
    console.log('📋 Verificando tabla no_show_rules...');
    const rulesResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'no_show_rules'
      ORDER BY ordinal_position;
    `);
    console.log('Columnas encontradas:', rulesResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    const rulesCount = await client.query('SELECT COUNT(*) FROM no_show_rules');
    console.log(`✅ ${rulesCount.rows[0].count} reglas en la base de datos\n`);
    
    // Verificar clients
    console.log('📋 Verificando columnas de valoración en tabla clients...');
    const clientsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name LIKE 'rating_%'
      ORDER BY column_name;
    `);
    console.log('Columnas de rating encontradas:', clientsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    // Verificar que existan las columnas necesarias
    const requiredColumns = ['rating_punctuality', 'rating_behavior', 'rating_kindness', 'rating_education', 'rating_tip'];
    const existingColumns = clientsResult.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Columnas faltantes:', missingColumns.join(', '));
    } else {
      console.log('✅ Todas las columnas de valoración existen\n');
    }
    
    // Verificar datos de ejemplo
    console.log('📊 Datos de ejemplo:');
    const sampleCriteria = await client.query('SELECT id, name, default_value FROM rating_criteria LIMIT 3');
    console.log('Criterios:', sampleCriteria.rows);
    
    const sampleRules = await client.query('SELECT id, no_show_count, block_days FROM no_show_rules LIMIT 3');
    console.log('Reglas:', sampleRules.rows);
    
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyRatingSchema().catch(console.error);
