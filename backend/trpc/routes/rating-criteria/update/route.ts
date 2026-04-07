import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateRatingCriteriaProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      defaultValue: z.number().min(1).max(5),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE RATING CRITERIA] Actualizando criterio:', input.id);

    const checkResult = await ctx.db.query(
      'SELECT is_special_criteria FROM rating_criteria WHERE id = $1',
      [input.id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Criterio no encontrado');
    }

    if (checkResult.rows[0].is_special_criteria) {
      throw new Error('No se puede editar el nombre/descripción del criterio No Shows');
    }

    await ctx.db.query(
      `UPDATE rating_criteria 
       SET name = $1, description = $2, default_value = $3, updated_at = $4
       WHERE id = $5`,
      [input.name, input.description, input.defaultValue, new Date(), input.id]
    );

    console.log('✅ [UPDATE RATING CRITERIA] Criterio actualizado');

    return { success: true };
  });
