import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const setVisibilityProcedure = publicProcedure
  .input(
    z.object({
      planId: z.string(),
      visible: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SET PLAN VISIBILITY] Configurando visibilidad del plan:', input.planId);

    try {
      const result = await ctx.db.query(
        `UPDATE subscription_plans SET is_visible = $1, updated_at = $2 WHERE id = $3`,
        [input.visible, new Date(), input.planId]
      );

      if (result.rowCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan no encontrado',
        });
      }

      console.log('✅ [SET PLAN VISIBILITY] Visibilidad actualizada:', {
        planId: input.planId,
        visible: input.visible,
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [SET PLAN VISIBILITY] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar visibilidad: ${error.message}`,
      });
    }
  });
