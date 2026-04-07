import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createNoShowRuleProcedure = publicProcedure
  .input(
    z.object({
      noShowCount: z.number().min(1),
      blockDays: z.number().min(1),
      message: z.string().min(10),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE NO SHOW RULE] Creando regla:', input);

    const id = `rule-${Date.now()}`;

    await ctx.db.query(
      `INSERT INTO no_show_rules (id, no_shows_required, block_days, message, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.noShowCount, input.blockDays, input.message, true, new Date(), new Date()]
    );

    console.log('✅ [CREATE NO SHOW RULE] Regla creada con ID:', id);

    return { id, success: true };
  });
