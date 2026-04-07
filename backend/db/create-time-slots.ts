import pg from 'pg';
const { Pool } = pg;

async function createTimeSlots() {
  console.log('🕐 Creando horas disponibles...');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ Falta variable de entorno DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión establecida\n');

    console.log('📋 Eliminando horas anteriores...');
    await pool.query('DELETE FROM time_slots');
    console.log('✅ Horas eliminadas\n');

    console.log('📋 Insertando horas desde 12:00 hasta 00:00...');
    
    const hours = [
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
      '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00'
    ];

    for (const time of hours) {
      const id = `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await pool.query(
        'INSERT INTO time_slots (id, time, is_active, created_at) VALUES ($1, $2, true, NOW())',
        [id, time]
      );
      console.log(`  ✅ ${time}`);
    }

    console.log(`\n🎉 ${hours.length} horas creadas exitosamente\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTimeSlots();
