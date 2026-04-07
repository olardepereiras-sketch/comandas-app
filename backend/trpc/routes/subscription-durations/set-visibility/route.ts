import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const setDurationVisibilityProcedure = publicProcedure
  .input(
    z.object({
      durationId: z.string(),
      visible: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SET DURATION VISIBILITY] Configurando visibilidad de duración:', input.durationId);

    try {
      const result = await ctx.db.query(
        `UPDATE subscription_durations SET is_visible = $1, updated_at = $2 WHERE id = $3`,
        [input.visible, new Date(), input.durationId]
      );

      if (result.rowCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Duración no encontrada',
        });
      }

      console.log('✅ [SET DURATION VISIBILITY] Visibilidad actualizada:', {
        durationId: input.durationId,
        visible: input.visible,
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [SET DURATION VISIBILITY] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar visibilidad: ${error.message}`,
      });
    }
  });
