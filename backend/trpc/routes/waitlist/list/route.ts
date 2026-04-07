import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listWaitlistProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('[WAITLIST] Listando entradas para restaurante:', input.restaurantId);

    try {
      let query = `SELECT * FROM waitlist WHERE restaurant_id = $1 AND status = 'waiting'`;
      const params: unknown[] = [input.restaurantId];

      if (input.date) {
        query += ` AND date = $2`;
        params.push(input.date);
      }

      query += ` ORDER BY created_at ASC`;

      const result = await ctx.db.query(query, params);
      return result.rows;
    } catch {
      return [];
    }
  });
