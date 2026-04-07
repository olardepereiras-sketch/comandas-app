import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const setPlanDurationsProcedure = publicProcedure
  .input(
    z.object({
      planId: z.string(),
      durationIds: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SET PLAN DURATIONS] Configurando duraciones del plan:', input.planId);

    try {
      const result = await ctx.db.query(
        `UPDATE subscription_plans SET allowed_duration_ids = $1, updated_at = $2 WHERE id = $3`,
        [JSON.stringify(input.durationIds), new Date(), input.planId]
      );

      if (result.rowCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan no encontrado',
        });
      }

      console.log('✅ [SET PLAN DURATIONS] Duraciones actualizadas:', {
        planId: input.planId,
        durationIds: input.durationIds,
      });

      return { success: true };
    } catch (error: any) {
      console.error('❌ [SET PLAN DURATIONS] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar duraciones: ${error.message}`,
      });
    }
  });
