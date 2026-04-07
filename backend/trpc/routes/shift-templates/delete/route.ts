import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteShiftTemplateProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE SHIFT TEMPLATE] Eliminando plantilla:', input.id);

    await ctx.db.query(
      'DELETE FROM shift_templates WHERE id = $1',
      [input.id]
    );

    console.log('✅ [DELETE SHIFT TEMPLATE] Plantilla eliminada:', input.id);

    return { success: true };
  });
