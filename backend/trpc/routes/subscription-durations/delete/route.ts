import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteSubscriptionDurationProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE SUBSCRIPTION DURATION] Eliminando duración:', input.id);

    try {
      const checkResult = await ctx.db.query(
        'SELECT id FROM subscription_durations WHERE id = $1',
        [input.id]
      );

      if (checkResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Duración no encontrada',
        });
      }

      const result = await ctx.db.query(
        'DELETE FROM subscription_durations WHERE id = $1',
        [input.id]
      );

      console.log('✅ [DELETE SUBSCRIPTION DURATION] Duración eliminada:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [DELETE SUBSCRIPTION DURATION] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar la duración: ${error.message}`,
      });
    }
  });
