import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const listBlocksRoute = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('📋 [LIST BLOCKS] Listando bloqueos:', input.restaurantId, 'fecha:', input.date);

    await ctx.db.query(
      `CREATE TABLE IF NOT EXISTS table_blocks (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 120,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      []
    );

    let query = `SELECT 
        tb.id,
        tb.table_id,
        tb.location_id,
        tb.start_time,
        tb.end_time,
        tb.duration_minutes,
        t.name as table_name,
        tl.name as location_name
       FROM table_blocks tb
       JOIN tables t ON tb.table_id = t.id
       JOIN table_locations tl ON tb.location_id = tl.id
       WHERE tb.restaurant_id = $1`;

    const params: any[] = [input.restaurantId];

    if (input.date) {
      query += ` AND tb.start_time::date = $2::date AND tb.end_time > NOW()`;
      params.push(input.date);
    } else {
      query += ` AND tb.end_time > NOW()`;
    }

    query += ` ORDER BY tb.start_time ASC`;

    const result = await ctx.db.query(query, params);

    const blocks = result.rows.map((row: any) => ({
      id: row.id,
      tableId: row.table_id,
      tableName: row.table_name,
      locationId: row.location_id,
      locationName: row.location_name,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
    }));

    console.log('✅ [LIST BLOCKS] Bloqueos listados:', blocks.length);
    return blocks;
  });
