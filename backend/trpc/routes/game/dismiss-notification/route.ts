import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const dismissGameNotificationProcedure = publicProcedure
  .input(z.object({ notificationId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🎮 [GAME NOTIFICATIONS] Dismissing notification:', input.notificationId);
    try {
      await ctx.db.query(
        `UPDATE game_notifications SET dismissed = true WHERE id = $1`,
        [input.notificationId]
      );
      return { success: true };
    } catch (error: any) {
      console.error('❌ [GAME NOTIFICATIONS DISMISS] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error: ${error.message}` });
    }
  });
