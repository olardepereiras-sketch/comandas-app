import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

async function fixShiftsData() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('🔧 [FIX SHIFTS] Corrigiendo datos de day_exceptions...\n');

    const result = await client.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1',
      ['rest-1766786871175-ko9fxf2eu']
    );

    console.log(`📊 Total excepciones a revisar: ${result.rows.length}\n`);

    for (const row of result.rows) {
      try {
        const templateIds = JSON.parse(row.template_ids);
        
        if (!Array.isArray(templateIds) || templateIds.length === 0) {
          console.log(`⏭️  Excepción ${row.date}: sin shifts, omitiendo`);
          continue;
        }

        let needsFix = false;
        const fixedShifts = templateIds.map((shift: any) => {
          if (shift.startTime === shift.endTime) {
            needsFix = true;
            const [startHour, startMinute] = shift.startTime.split(':').map(Number);
            const endMinute = startMinute + 30;
            let endHour = startHour;
            let finalEndMinute = endMinute;
            
            if (endMinute >= 60) {
              endHour = startHour + 1;
              finalEndMinute = endMinute - 60;
            }
            
            const endTime = `${endHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`;
            
            return {
              ...shift,
              endTime: endTime,
            };
          }
          return shift;
        });

        if (needsFix) {
          await client.query(
            'UPDATE day_exceptions SET template_ids = $1, updated_at = $2 WHERE id = $3',
            [JSON.stringify(fixedShifts), new Date(), row.id]
          );
          console.log(`✅ Excepción ${row.date} corregida: ${fixedShifts.length} shifts actualizados`);
          fixedShifts.forEach((s: any, i: number) => {
            console.log(`   Shift ${i + 1}: ${s.startTime} → ${s.endTime}`);
          });
        } else {
          console.log(`✓  Excepción ${row.date}: ya correcta`);
        }
      } catch (e) {
        console.error(`❌ Error procesando excepción ${row.id}:`, e);
      }
    }

    console.log('\n✅ Corrección completada');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixShiftsData().catch(console.error);
