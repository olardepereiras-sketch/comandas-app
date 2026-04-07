import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createShiftTemplateProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      name: z.string(),
      times: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SHIFT TEMPLATE] Creando plantilla:', input);

    const id = `shift-template-${Date.now()}`;
    const now = new Date();

    await ctx.db.query(
      `INSERT INTO shift_templates (id, restaurant_id, name, times, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.restaurantId,
        input.name,
        JSON.stringify(input.times),
        now,
        now,
      ]
    );

    console.log('✅ [CREATE SHIFT TEMPLATE] Plantilla creada:', id);

    return {
      id,
      restaurantId: input.restaurantId,
      name: input.name,
      times: input.times,
      createdAt: now,
      updatedAt: now,
    };
  });
