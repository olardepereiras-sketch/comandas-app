import { Pool } from 'pg';

console.log('🔍 Diagnosticando error de creación de reservas...');

const connectionString = 'postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db';

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function diagnose() {
  try {
    const client = await pool.connect();
    
    console.log('\n📊 VERIFICANDO ESQUEMA DE TABLA RESERVATIONS...\n');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columnas en tabla reservations:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('\n🔍 VERIFICANDO COLUMNAS REQUERIDAS...\n');
    
    const requiredColumns = [
      'id', 'restaurant_id', 'client_id', 'client_phone', 'client_name', 'client_email',
      'date', 'time', 'guests', 'location_id', 'location_name', 'table_ids', 
      'needs_high_chair', 'high_chair_count', 'needs_stroller', 'has_pets', 
      'status', 'notes', 'client_notes', 'confirmation_token', 'confirmation_token2', 
      'token', 'created_at', 'updated_at'
    ];
    
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ COLUMNAS FALTANTES:', missingColumns.join(', '));
    } else {
      console.log('✅ Todas las columnas requeridas existen');
    }
    
    console.log('\n🧪 INTENTANDO INSERT DE PRUEBA...\n');
    
    const testReservationId = `test-res-${Date.now()}`;
    const testClientId = `test-client-${Date.now()}`;
    const now = new Date();
    
    try {
      await client.query(
        `INSERT INTO reservations (id, restaurant_id, client_id, client_phone, client_name, client_email,
              date, time, guests, location_id, location_name, table_ids, needs_high_chair, high_chair_count,
              needs_stroller, has_pets, status, notes, client_notes, confirmation_token, confirmation_token2, token, created_at, updated_at) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          testReservationId,
          'rest-test',
          testClientId,
          '+34666000000',
          'Test Cliente',
          '',
          '2026-01-16',
          JSON.stringify({ hour: 20, minute: 0 }),
          4,
          'loc-test',
          'Test Location',
          JSON.stringify(['table-test']),
          false,
          0,
          false,
          false,
          'confirmed',
          '',
          '',
          'token-test',
          null,
          'token-test',
          now,
          now,
        ]
      );
      console.log('✅ INSERT DE PRUEBA EXITOSO');
      
      await client.query('DELETE FROM reservations WHERE id = $1', [testReservationId]);
      console.log('✅ Registro de prueba eliminado');
      
    } catch (insertError: any) {
      console.error('❌ ERROR EN INSERT DE PRUEBA:');
      console.error('   Mensaje:', insertError.message);
      console.error('   Code:', insertError.code);
      console.error('   Detail:', insertError.detail);
      console.error('   Constraint:', insertError.constraint);
    }
    
    client.release();
    await pool.end();
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error: any) {
    console.error('❌ Error en diagnóstico:', error.message);
    process.exit(1);
  }
}

diagnose();
