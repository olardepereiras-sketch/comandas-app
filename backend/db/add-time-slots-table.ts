import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addTimeSlotsTable() {
  try {
    console.log('Creating time_slots table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id TEXT PRIMARY KEY,
        time TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ time_slots table created successfully');
    
    console.log('Adding default time slots...');
    const defaultTimeSlots = [
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
      '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
    ];
    
    for (const time of defaultTimeSlots) {
      const id = `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await pool.query(
        'INSERT INTO time_slots (id, time) VALUES ($1, $2) ON CONFLICT (time) DO NOTHING',
        [id, time]
      );
    }
    
    console.log('✅ Default time slots added successfully');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTimeSlotsTable();
