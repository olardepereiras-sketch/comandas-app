import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createDayExceptionProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      isOpen: z.boolean(),
      templateIds: z.array(z.string()).optional(),
      maxGuestsOverride: z.number().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE DAY EXCEPTION] Creando excepción:', input);

    const id = `day-exception-${Date.now()}`;
    const now = new Date();

    await ctx.db.query(
      `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, max_guests_override, notes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        input.restaurantId,
        input.date,
        input.isOpen,
        JSON.stringify(input.templateIds || []),
        input.maxGuestsOverride || null,
        input.notes || null,
        now,
        now,
      ]
    );

    console.log('✅ [CREATE DAY EXCEPTION] Excepción creada:', id);

    return {
      id,
      restaurantId: input.restaurantId,
      date: input.date,
      isOpen: input.isOpen,
      templateIds: input.templateIds || [],
      maxGuestsOverride: input.maxGuestsOverride,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
  });
