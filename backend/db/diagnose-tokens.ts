#!/usr/bin/env bun
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function diagnoseTokens() {
  console.log('🔍 DIAGNÓSTICO DE TOKENS DE RESERVA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const result = await pool.query(`
      SELECT 
        id,
        client_id,
        restaurant_id,
        date,
        time,
        guests,
        status,
        confirmation_token,
        token,
        confirmation_token2,
        created_at
      FROM reservations
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ No hay reservas activas en el sistema\n');
      return;
    }

    console.log(`📋 Encontradas ${result.rows.length} reservas activas:\n`);

    for (const row of result.rows) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${row.id}`);
      console.log(`Estado: ${row.status}`);
      console.log(`Fecha: ${row.date}`);
      console.log(`Hora: ${JSON.stringify(row.time)}`);
      console.log(`Comensales: ${row.guests}`);
      console.log(`\n📧 TOKENS:`);
      console.log(`  confirmation_token: ${row.confirmation_token || 'NULL ❌'}`);
      console.log(`  token: ${row.token || 'NULL ❌'}`);
      console.log(`  confirmation_token2: ${row.confirmation_token2 || 'NULL ❌'}`);
      
      console.log(`\n🔗 URLs de acceso:`);
      if (row.confirmation_token) {
        console.log(`  Token principal: https://quieromesa.com/client/reservation/${row.confirmation_token}`);
      }
      if (row.token) {
        console.log(`  Token alternativo: https://quieromesa.com/client/reservation/${row.token}`);
      }
      if (row.confirmation_token2) {
        console.log(`  Token2 (pendientes): https://quieromesa.com/client/reservation2/${row.confirmation_token2}`);
      }
      console.log('');
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('📊 RESUMEN DE TOKENS:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(confirmation_token) as con_token,
        COUNT(token) as token_field,
        COUNT(confirmation_token2) as con_token2
      FROM reservations
      WHERE status != 'cancelled'
    `);

    const s = summary.rows[0];
    console.log(`Total reservas activas: ${s.total}`);
    console.log(`Con confirmation_token: ${s.con_token} (${((s.con_token/s.total)*100).toFixed(1)}%)`);
    console.log(`Con token: ${s.token_field} (${((s.token_field/s.total)*100).toFixed(1)}%)`);
    console.log(`Con confirmation_token2: ${s.con_token2} (${((s.con_token2/s.total)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

diagnoseTokens();
