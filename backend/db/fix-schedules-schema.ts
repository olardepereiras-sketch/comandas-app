import { Pool } from 'pg';

console.log('🔄 Migrando tabla schedules a nueva estructura...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixSchedulesSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando estructura actual de schedules...');
    const checkTable = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedules'
    `);
    
    const columns = checkTable.rows.map(row => row.column_name);
    console.log('Columnas actuales:', columns);

    if (columns.includes('shift_name')) {
      console.log('⚠️  Detectada estructura antigua. Migrando datos...');
      
      console.log('1️⃣ Respaldando datos existentes...');
      const oldData = await client.query('SELECT * FROM schedules');
      console.log(`   - ${oldData.rows.length} registros encontrados`);

      console.log('2️⃣ Eliminando tabla antigua...');
      await client.query('DROP TABLE IF EXISTS schedules CASCADE');

      console.log('3️⃣ Creando nueva estructura...');
      await client.query(`
        CREATE TABLE schedules (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          day_of_week INTEGER NOT NULL,
          is_open BOOLEAN NOT NULL DEFAULT true,
          shifts TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )
      `);

      console.log('4️⃣ Migrando datos al nuevo formato...');
      
      const groupedSchedules = new Map<string, any[]>();
      for (const row of oldData.rows) {
        const key = `${row.restaurant_id}-${row.day_of_week}`;
        if (!groupedSchedules.has(key)) {
          groupedSchedules.set(key, []);
        }
        groupedSchedules.get(key)!.push(row);
      }

      for (const [, rows] of groupedSchedules.entries()) {
        const firstRow = rows[0];
        const shifts = rows.map(row => ({
          id: row.id,
          name: row.shift_name || 'Turno',
          startTime: row.start_time,
          endTime: row.end_time,
          maxGuestsPerHour: parseInt(row.max_capacity) || 0,
          minRating: parseFloat(row.min_client_rating) || 0,
        }));

        const newId = `sch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await client.query(
          `INSERT INTO schedules (id, restaurant_id, day_of_week, is_open, shifts, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newId,
            firstRow.restaurant_id,
            firstRow.day_of_week,
            firstRow.is_active !== false,
            JSON.stringify(shifts),
            now,
            now,
          ]
        );
      }

      const newCount = await client.query('SELECT COUNT(*) FROM schedules');
      console.log(`   - ${newCount.rows[0].count} horarios migrados`);
    } else {
      console.log('✅ La estructura ya está actualizada');
    }

    console.log('🎉 Migración completada exitosamente');
  } catch (error: any) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchedulesSchema();
