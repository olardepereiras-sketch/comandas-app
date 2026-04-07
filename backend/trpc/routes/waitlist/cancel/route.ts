import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const cancelWaitlistEntryProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      clientPhone: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[WAITLIST] Cancelando entrada:', input.id);
    await ctx.db.query(
      `UPDATE waitlist SET status = 'cancelled' WHERE id = $1 AND client_phone = $2`,
      [input.id, input.clientPhone]
    );
    return { success: true };
  });
