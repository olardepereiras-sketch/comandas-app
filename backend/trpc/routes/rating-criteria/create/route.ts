import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createRatingCriteriaProcedure = publicProcedure
  .input(
    z.object({
      name: z.string(),
      description: z.string(),
      defaultValue: z.number().min(1).max(5),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE RATING CRITERIA] Creando criterio:', input);

    const id = `criteria-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const orderResult = await ctx.db.query(
      'SELECT MAX(order_num) as max_order FROM rating_criteria'
    );
    const nextOrder = (orderResult.rows[0]?.max_order || 0) + 1;

    const result = await ctx.db.query(
      `INSERT INTO rating_criteria (id, name, description, default_value, is_special_criteria, is_active, order_num, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, input.name, input.description, input.defaultValue, false, true, nextOrder, new Date(), new Date()]
    );

    console.log('✅ [CREATE RATING CRITERIA] Criterio creado:', result.rows[0]);

    return {
      id,
      name: input.name,
      description: input.description,
      defaultValue: input.defaultValue,
      isActive: true,
      orderNum: nextOrder,
    };
  });
