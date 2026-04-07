import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteDayExceptionProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE DAY EXCEPTION] Eliminando excepción:', input.id);

    await ctx.db.query(
      'DELETE FROM day_exceptions WHERE id = $1',
      [input.id]
    );

    console.log('✅ [DELETE DAY EXCEPTION] Excepción eliminada:', input.id);

    return { success: true };
  });
