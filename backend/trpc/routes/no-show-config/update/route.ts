import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateNoShowConfigProcedure = publicProcedure
  .input(
    z.object({
      occurrence: z.number().min(1).max(3),
      blockDays: z.number().min(1),
      message: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE NO SHOW CONFIG] Actualizando configuración:', input.occurrence);

    await ctx.db.query(
      `UPDATE no_show_config 
       SET block_days = $1, message = $2, updated_at = $3
       WHERE occurrence = $4`,
      [input.blockDays, input.message, new Date(), input.occurrence]
    );

    console.log('✅ [UPDATE NO SHOW CONFIG] Configuración actualizada');

    return { success: true };
  });
