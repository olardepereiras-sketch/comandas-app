import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseTableConflicts() {
  console.log('🔍 DIAGNÓSTICO DE CONFLICTOS DE MESAS');
  console.log('=====================================\n');

  try {
    const restaurantsResult = await pool.query('SELECT id, name FROM restaurants ORDER BY name');
    
    for (const restaurant of restaurantsResult.rows) {
      console.log(`\n📍 Restaurante: ${restaurant.name}`);
      console.log('─'.repeat(60));

      const tablesResult = await pool.query(
        'SELECT * FROM tables WHERE restaurant_id = $1',
        [restaurant.id]
      );

      if (tablesResult.rows.length === 0) {
        console.log('  ⚠️  No hay mesas configuradas\n');
        continue;
      }

      const rotationTimes = new Map<string, number>();
      tablesResult.rows.forEach((table: any) => {
        rotationTimes.set(table.id, table.rotation_time_minutes || 120);
      });

      console.log(`  Mesas configuradas: ${tablesResult.rows.length}`);
      console.log(`  Tiempos de rotación:`);
      tablesResult.rows.forEach((table: any) => {
        console.log(`    - ${table.name}: ${table.rotation_time_minutes || 120} minutos`);
      });

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 14);

      const reservationsResult = await pool.query(
        `SELECT r.*, 
                COALESCE(t.rotation_time_minutes, 120) as rotation_time_minutes,
                t.name as table_name
         FROM reservations r
         LEFT JOIN tables t ON t.id = ANY(string_to_array(trim(both '[]' from r.table_ids::text), ',')::text[])
         WHERE r.restaurant_id = $1 
         AND r.date >= $2 
         AND r.date <= $3
         AND r.status != 'cancelled'
         ORDER BY r.date, (r.time::json->>'hour')::int, (r.time::json->>'minute')::int`,
        [restaurant.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      if (reservationsResult.rows.length === 0) {
        console.log('  ℹ️  No hay reservas en el rango de fechas\n');
        continue;
      }

      console.log(`\n  Reservas encontradas: ${reservationsResult.rows.length}`);
      console.log('\n  🔍 Buscando conflictos...\n');

      const conflicts: any[] = [];

      for (let i = 0; i < reservationsResult.rows.length; i++) {
        const res1 = reservationsResult.rows[i] as any;
        const time1 = typeof res1.time === 'string' ? JSON.parse(res1.time) : res1.time;
        const timeMinutes1 = time1.hour * 60 + time1.minute;
        const tableIds1 = typeof res1.table_ids === 'string' 
          ? JSON.parse(res1.table_ids) 
          : res1.table_ids;
        
        if (!Array.isArray(tableIds1) || tableIds1.length === 0) continue;

        for (let j = i + 1; j < reservationsResult.rows.length; j++) {
          const res2 = reservationsResult.rows[j] as any;
          
          if (res1.date !== res2.date) continue;

          const time2 = typeof res2.time === 'string' ? JSON.parse(res2.time) : res2.time;
          const timeMinutes2 = time2.hour * 60 + time2.minute;
          const tableIds2 = typeof res2.table_ids === 'string' 
            ? JSON.parse(res2.table_ids) 
            : res2.table_ids;
          
          if (!Array.isArray(tableIds2) || tableIds2.length === 0) continue;

          const sharedTables = tableIds1.filter((t: string) => tableIds2.includes(t));
          
          if (sharedTables.length > 0) {
            const timeDiff = Math.abs(timeMinutes2 - timeMinutes1);
            
            for (const tableId of sharedTables) {
              const rotationTime = rotationTimes.get(tableId) || 120;
              
              if (timeDiff < rotationTime) {
                const tableName = tablesResult.rows.find((t: any) => t.id === tableId)?.name || tableId;
                
                conflicts.push({
                  date: res1.date,
                  table: tableName,
                  tableId: tableId,
                  reservation1: {
                    id: res1.id,
                    time: `${String(time1.hour).padStart(2, '0')}:${String(time1.minute).padStart(2, '0')}`,
                    client: res1.client_name,
                    guests: res1.guests,
                  },
                  reservation2: {
                    id: res2.id,
                    time: `${String(time2.hour).padStart(2, '0')}:${String(time2.minute).padStart(2, '0')}`,
                    client: res2.client_name,
                    guests: res2.guests,
                  },
                  timeDiff: timeDiff,
                  rotationTime: rotationTime,
                  violation: rotationTime - timeDiff,
                });
              }
            }
          }
        }
      }

      if (conflicts.length === 0) {
        console.log('  ✅ No se encontraron conflictos\n');
      } else {
        console.log(`  ❌ ¡CONFLICTOS DETECTADOS! (${conflicts.length})\n`);
        
        conflicts.forEach((conflict, index) => {
          console.log(`  Conflicto #${index + 1}:`);
          console.log(`    Fecha: ${conflict.date}`);
          console.log(`    Mesa: ${conflict.table} (${conflict.tableId})`);
          console.log(`    Tiempo de rotación configurado: ${conflict.rotationTime} min`);
          console.log(`    Diferencia entre reservas: ${conflict.timeDiff} min`);
          console.log(`    Violación: ${conflict.violation} min`);
          console.log(`    `);
          console.log(`    Reserva 1:`);
          console.log(`      - ID: ${conflict.reservation1.id}`);
          console.log(`      - Hora: ${conflict.reservation1.time}`);
          console.log(`      - Cliente: ${conflict.reservation1.client}`);
          console.log(`      - Comensales: ${conflict.reservation1.guests}`);
          console.log(`    `);
          console.log(`    Reserva 2:`);
          console.log(`      - ID: ${conflict.reservation2.id}`);
          console.log(`      - Hora: ${conflict.reservation2.time}`);
          console.log(`      - Cliente: ${conflict.reservation2.client}`);
          console.log(`      - Comensales: ${conflict.reservation2.guests}`);
          console.log('');
        });
      }
    }

    console.log('\n✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseTableConflicts();
