import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

async function cleanCorruptedExceptions() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('🧹 [CLEAN] Limpiando day_exceptions corruptos...\n');

    const result = await client.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1',
      ['rest-1766786871175-ko9fxf2eu']
    );

    console.log(`📊 Total excepciones: ${result.rows.length}\n`);

    let cleaned = 0;
    let deleted = 0;

    for (const row of result.rows) {
      try {
        const templateIds = JSON.parse(row.template_ids);
        
        const hasCorruption = templateIds.some((s: any) => 
          !s.startTime || 
          !s.endTime || 
          s.startTime === s.endTime
        );

        if (hasCorruption) {
          console.log(`❌ Excepción corrupta encontrada: ${row.date}`);
          console.log(`   Borrando...`);
          
          await client.query(
            'DELETE FROM day_exceptions WHERE id = $1',
            [row.id]
          );
          
          deleted++;
        } else {
          cleaned++;
        }
      } catch {
        console.log(`❌ Error procesando excepción ${row.date}, borrando...`);
        await client.query(
          'DELETE FROM day_exceptions WHERE id = $1',
          [row.id]
        );
        deleted++;
      }
    }

    console.log('\n✅ Limpieza completada:');
    console.log(`   ✓ Excepciones válidas: ${cleaned}`);
    console.log(`   ✗ Excepciones borradas: ${deleted}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanCorruptedExceptions().catch(console.error);
