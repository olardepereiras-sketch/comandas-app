import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT!,
  authToken: process.env.EXPO_PUBLIC_RORK_DB_TOKEN!,
});

async function fixDateFormats() {
  console.log('✅ Conexión establecida');
  console.log('📋 Corrigiendo formatos de fechas...');

  const result = await db.execute('SELECT * FROM day_exceptions');
  
  console.log(`📊 Encontradas ${result.rows.length} excepciones de día`);

  let fixed = 0;
  for (const row of result.rows) {
    const currentDate = row.date;
    let newDate: string;

    if (typeof currentDate === 'string' && (currentDate.includes('GMT') || currentDate.includes('('))) {
      const parsedDate = new Date(currentDate);
      const utcYear = parsedDate.getUTCFullYear();
      const utcMonth = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
      const utcDay = String(parsedDate.getUTCDate()).padStart(2, '0');
      newDate = `${utcYear}-${utcMonth}-${utcDay}`;

      console.log(`🔧 Corrigiendo fecha mal formateada:`);
      console.log(`   Antes: ${currentDate}`);
      console.log(`   Después: ${newDate}`);

      await db.execute({
        sql: 'UPDATE day_exceptions SET date = ? WHERE id = ?',
        args: [newDate, row.id as string],
      });

      fixed++;
    } else if (typeof currentDate === 'object' && currentDate !== null) {
      const dateObj = currentDate as any;
      const utcYear = dateObj.getUTCFullYear ? dateObj.getUTCFullYear() : new Date(dateObj).getUTCFullYear();
      const utcMonth = String((dateObj.getUTCMonth ? dateObj.getUTCMonth() : new Date(dateObj).getUTCMonth()) + 1).padStart(2, '0');
      const utcDay = String(dateObj.getUTCDate ? dateObj.getUTCDate() : new Date(dateObj).getUTCDate()).padStart(2, '0');
      newDate = `${utcYear}-${utcMonth}-${utcDay}`;

      console.log(`🔧 Corrigiendo fecha objeto:`);
      console.log(`   Antes: ${JSON.stringify(currentDate)}`);
      console.log(`   Después: ${newDate}`);

      await db.execute({
        sql: 'UPDATE day_exceptions SET date = ? WHERE id = ?',
        args: [newDate, row.id as string],
      });

      fixed++;
    }
  }

  console.log(`✅ Se corrigieron ${fixed} fechas`);
}

fixDateFormats()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
