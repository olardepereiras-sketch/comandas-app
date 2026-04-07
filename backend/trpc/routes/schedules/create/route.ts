import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createScheduleProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      dayOfWeek: z.number().min(0).max(6),
      isOpen: z.boolean(),
      shifts: z.array(
        z.object({
          templateId: z.string(),
          name: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          maxGuestsPerHour: z.number(),
          minRating: z.number(),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SCHEDULE] Creando horario:', input);

    const id = `sch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    try {
      const result = await ctx.db.query(
        `INSERT INTO schedules (id, restaurant_id, day_of_week, is_open, shifts, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          input.restaurantId,
          input.dayOfWeek,
          input.isOpen,
          JSON.stringify(input.shifts),
          now,
          now,
        ]
      );

      console.log('✅ [CREATE SCHEDULE] Horario creado:', {
        id,
        dayOfWeek: input.dayOfWeek,
        rowsAffected: result.rowCount,
      });

      return { id, success: true };
    } catch (error: any) {
      console.error('❌ [CREATE SCHEDULE] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al crear el horario: ${error.message}`,
      });
    }
  });
