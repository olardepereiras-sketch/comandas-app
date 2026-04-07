import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteNoShowRuleProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE NO SHOW RULE] Eliminando regla:', input.id);

    await ctx.db.query(
      `UPDATE no_show_rules SET is_active = false, updated_at = $1 WHERE id = $2`,
      [new Date(), input.id]
    );

    console.log('✅ [DELETE NO SHOW RULE] Regla desactivada');

    return { success: true };
  });
