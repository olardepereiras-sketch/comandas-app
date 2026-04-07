import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function diagnoseDeleteCancel() {
  console.log('🔍 DIAGNÓSTICO: Borrado de Usuarios y Anulación de Reservas');
  console.log('═'.repeat(80));
  
  try {
    console.log('\n📋 1. Verificando permisos de la base de datos...');
    console.log('─'.repeat(80));
    
    const userResult = await pool.query('SELECT current_user, current_database()');
    console.log('✅ Usuario actual:', userResult.rows[0].current_user);
    console.log('✅ Base de datos:', userResult.rows[0].current_database);
    
    console.log('\n📋 2. Verificando permisos en tablas críticas...');
    console.log('─'.repeat(80));
    
    const tables = ['clients', 'reservations', 'no_shows'];
    for (const table of tables) {
      try {
        const privResult = await pool.query(`
          SELECT 
            has_table_privilege(current_user, $1, 'SELECT') as can_select,
            has_table_privilege(current_user, $1, 'INSERT') as can_insert,
            has_table_privilege(current_user, $1, 'UPDATE') as can_update,
            has_table_privilege(current_user, $1, 'DELETE') as can_delete
        `, [table]);
        
        const priv = privResult.rows[0];
        console.log(`\nTabla: ${table}`);
        console.log(`  SELECT: ${priv.can_select ? '✅' : '❌'}`);
        console.log(`  INSERT: ${priv.can_insert ? '✅' : '❌'}`);
        console.log(`  UPDATE: ${priv.can_update ? '✅' : '❌'}`);
        console.log(`  DELETE: ${priv.can_delete ? '✅' : '❌'}`);
        
        if (!priv.can_delete) {
          console.log(`  ⚠️  PROBLEMA: No hay permisos de DELETE en ${table}`);
        }
      } catch (error: any) {
        console.error(`❌ Error verificando ${table}:`, error.message);
      }
    }
    
    console.log('\n📋 3. Verificando constraints y foreign keys...');
    console.log('─'.repeat(80));
    
    const fkResult = await pool.query(`
      SELECT
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name IN ('clients', 'reservations', 'no_shows')
             OR ccu.table_name IN ('clients', 'reservations', 'no_shows'))
      ORDER BY tc.table_name
    `);
    
    console.log('\nForeign Keys encontradas:');
    for (const fk of fkResult.rows) {
      console.log(`\n  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`  Delete Rule: ${fk.delete_rule}`);
      
      if (fk.delete_rule === 'RESTRICT' || fk.delete_rule === 'NO ACTION') {
        console.log(`  ⚠️  Esta FK podría bloquear el borrado`);
      }
    }
    
    console.log('\n📋 4. Test de borrado de cliente (simulado)...');
    console.log('─'.repeat(80));
    
    await pool.query('BEGIN');
    
    try {
      const testClient = await pool.query(`
        INSERT INTO clients (id, name, email, phone, rating, created_at, updated_at)
        VALUES ('test-client-123', 'Test User', 'test@test.com', '+34999999999', 5, NOW(), NOW())
        RETURNING *
      `);
      console.log('✅ Cliente de prueba creado:', testClient.rows[0].id);
      
      const testReservation = await pool.query(`
        SELECT id FROM restaurants LIMIT 1
      `);
      
      if (testReservation.rows.length > 0) {
        const restaurantId = testReservation.rows[0].id;
        await pool.query(`
          INSERT INTO reservations (
            id, restaurant_id, client_id, date, time, guests, status, 
            confirmation_token, created_at, updated_at
          )
          VALUES (
            'test-res-123', $1, 'test-client-123', CURRENT_DATE, '{"hour":14,"minute":0}', 2, 
            'confirmed', 'test-token', NOW(), NOW()
          )
        `, [restaurantId]);
        console.log('✅ Reserva de prueba creada');
        
        await pool.query(`
          DELETE FROM reservations WHERE id = 'test-res-123'
        `);
        console.log('✅ Reserva de prueba eliminada correctamente');
      }
      
      await pool.query(`
        DELETE FROM clients WHERE id = 'test-client-123'
      `);
      console.log('✅ Cliente de prueba eliminado correctamente');
      
      await pool.query('ROLLBACK');
      console.log('✅ Test completado (rollback realizado)');
      
    } catch (error: any) {
      await pool.query('ROLLBACK');
      console.error('❌ Error en test de borrado:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    console.log('\n📋 5. Test de actualización de reserva (simulado)...');
    console.log('─'.repeat(80));
    
    await pool.query('BEGIN');
    
    try {
      const existingRes = await pool.query(`
        SELECT * FROM reservations WHERE status = 'confirmed' LIMIT 1
      `);
      
      if (existingRes.rows.length > 0) {
        const resId = existingRes.rows[0].id;
        console.log('✅ Reserva encontrada:', resId);
        
        await pool.query(`
          UPDATE reservations 
          SET status = $1, updated_at = $2
          WHERE id = $3
        `, ['cancelled', new Date(), resId]);
        
        console.log('✅ Reserva actualizada a cancelled correctamente');
        
        const verification = await pool.query(`
          SELECT status FROM reservations WHERE id = $1
        `, [resId]);
        
        console.log('✅ Estado verificado:', verification.rows[0].status);
      } else {
        console.log('⚠️  No hay reservas confirmadas para probar');
      }
      
      await pool.query('ROLLBACK');
      console.log('✅ Test completado (rollback realizado)');
      
    } catch (error: any) {
      await pool.query('ROLLBACK');
      console.error('❌ Error en test de actualización:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    console.log('\n📋 6. Verificando índices...');
    console.log('─'.repeat(80));
    
    const indexResult = await pool.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'reservations', 'no_shows')
      ORDER BY tablename, indexname
    `);
    
    console.log('\nÍndices encontrados:');
    for (const idx of indexResult.rows) {
      console.log(`\n  ${idx.tablename} -> ${idx.indexname}`);
      console.log(`  ${idx.indexdef}`);
    }
    
    console.log('\n📋 7. Verificando triggers...');
    console.log('─'.repeat(80));
    
    const triggerResult = await pool.query(`
      SELECT
        event_object_table AS table_name,
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('clients', 'reservations', 'no_shows')
      ORDER BY event_object_table, trigger_name
    `);
    
    if (triggerResult.rows.length > 0) {
      console.log('\nTriggers encontrados:');
      for (const trigger of triggerResult.rows) {
        console.log(`\n  ${trigger.table_name} -> ${trigger.trigger_name}`);
        console.log(`  Evento: ${trigger.event_manipulation}`);
        console.log(`  Acción: ${trigger.action_statement}`);
      }
    } else {
      console.log('✅ No hay triggers que puedan interferir');
    }
    
    console.log('\n📋 8. Datos de ejemplo...');
    console.log('─'.repeat(80));
    
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    const reservationCount = await pool.query('SELECT COUNT(*) FROM reservations');
    const noShowCount = await pool.query('SELECT COUNT(*) FROM no_shows');
    
    console.log(`Clientes: ${clientCount.rows[0].count}`);
    console.log(`Reservas: ${reservationCount.rows[0].count}`);
    console.log(`No Shows: ${noShowCount.rows[0].count}`);
    
    if (parseInt(clientCount.rows[0].count) > 0) {
      const sampleClient = await pool.query('SELECT * FROM clients LIMIT 1');
      console.log('\nEjemplo de cliente:');
      console.log(JSON.stringify(sampleClient.rows[0], null, 2));
    }
    
    if (parseInt(reservationCount.rows[0].count) > 0) {
      const sampleReservation = await pool.query(`
        SELECT * FROM reservations 
        WHERE status = 'confirmed' 
        LIMIT 1
      `);
      if (sampleReservation.rows.length > 0) {
        console.log('\nEjemplo de reserva confirmada:');
        console.log(JSON.stringify(sampleReservation.rows[0], null, 2));
      }
    }
    
    console.log('\n═'.repeat(80));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('═'.repeat(80));
    
  } catch (error: any) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseDeleteCancel().catch(console.error);
