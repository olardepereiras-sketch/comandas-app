import { Pool } from 'pg';

console.log('🔧 Corrigiendo esquema completo de reservations...');

const connectionString = 'postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db';

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixSchema() {
  try {
    const client = await pool.connect();
    
    console.log('📋 Añadiendo todas las columnas necesarias...');
    
    const alterations = [
      { name: 'client_phone', type: 'TEXT', default: "''" },
      { name: 'client_name', type: 'TEXT', default: "''" },
      { name: 'client_email', type: 'TEXT', default: "''" },
      { name: 'location_name', type: 'TEXT', default: "''" },
      { name: 'client_notes', type: 'TEXT', default: "''" },
      { name: 'confirmation_token', type: 'TEXT', default: null },
      { name: 'confirmation_token2', type: 'TEXT', default: null },
      { name: 'token', type: 'TEXT', default: null },
      { name: 'high_chair_count', type: 'INTEGER', default: '0' },
    ];
    
    for (const col of alterations) {
      try {
        const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
        await client.query(`
          ALTER TABLE reservations 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} ${defaultClause};
        `);
        console.log(`✅ Columna ${col.name} verificada`);
      } catch (err: any) {
        console.log(`⚠️ Error con columna ${col.name}:`, err.message);
      }
    }
    
    console.log('\n📋 Verificando esquema final...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Columnas actuales en reservations:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });
    
    client.release();
    await pool.end();
    console.log('\n🎉 Esquema corregido exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
