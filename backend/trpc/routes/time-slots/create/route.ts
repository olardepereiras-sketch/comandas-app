import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createTimeSlotProcedure = publicProcedure
  .input(
    z.object({
      time: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const id = `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await ctx.db.query(
      'INSERT INTO time_slots (id, time, is_active, created_at) VALUES ($1, $2, true, NOW()) RETURNING id, time, created_at',
      [id, input.time]
    );
    
    return {
      id: result.rows[0].id,
      time: result.rows[0].time,
      createdAt: result.rows[0].created_at,
    };
  });
