import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const blockTableRoute = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      tableId: z.string(),
      locationId: z.string(),
      durationMinutes: z.number().default(120),
      startTimeISO: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔒 [BLOCK TABLE] Bloqueando mesa:', input);

    const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = input.startTimeISO ? new Date(input.startTimeISO) : new Date();
    const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);

    const checkLocation = await ctx.db.query(
      `SELECT id FROM table_locations WHERE id = $1 AND restaurant_id = $2`,
      [input.locationId, input.restaurantId]
    );

    if (checkLocation.rows.length === 0) {
      throw new Error('La ubicación no existe');
    }

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

    await ctx.db.query(
      `INSERT INTO table_blocks (id, restaurant_id, table_id, location_id, start_time, end_time, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [blockId, input.restaurantId, input.tableId, input.locationId, startTime, endTime, input.durationMinutes]
    );

    console.log('✅ [BLOCK TABLE] Mesa bloqueada exitosamente');

    return {
      id: blockId,
      tableId: input.tableId,
      locationId: input.locationId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: input.durationMinutes,
    };
  });
