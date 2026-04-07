import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateNoShowRuleProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      noShowCount: z.number().min(1),
      blockDays: z.number().min(1),
      message: z.string().min(10),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE NO SHOW RULE] Actualizando regla:', input.id);

    await ctx.db.query(
      `UPDATE no_show_rules 
       SET no_shows_required = $1, block_days = $2, message = $3, updated_at = $4
       WHERE id = $5`,
      [input.noShowCount, input.blockDays, input.message, new Date(), input.id]
    );

    console.log('✅ [UPDATE NO SHOW RULE] Regla actualizada');

    return { success: true };
  });
