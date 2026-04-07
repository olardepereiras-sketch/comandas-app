import { publicProcedure } from '../../../create-context';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const listTimeSlotsProcedure = publicProcedure.query(async () => {
  const result = await pool.query(
    'SELECT id, time, created_at FROM time_slots ORDER BY time ASC'
  );
  
  return result.rows.map(row => ({
    id: row.id,
    time: row.time,
    createdAt: row.created_at,
  }));
});
