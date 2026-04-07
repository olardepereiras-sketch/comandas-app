import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteRatingCriteriaProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE RATING CRITERIA] Eliminando criterio:', input.id);

    const checkResult = await ctx.db.query(
      'SELECT id FROM rating_criteria WHERE id = $1',
      [input.id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Criterio no encontrado');
    }

    await ctx.db.query(
      'DELETE FROM rating_criteria WHERE id = $1',
      [input.id]
    );

    console.log('✅ [DELETE RATING CRITERIA] Criterio eliminado');

    return { success: true };
  });
