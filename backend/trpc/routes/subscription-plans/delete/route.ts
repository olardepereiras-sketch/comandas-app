import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteSubscriptionPlanProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE SUBSCRIPTION PLAN] Eliminando tarifa:', input.id);

    try {
      const checkResult = await ctx.db.query(
        'SELECT id, name FROM subscription_plans WHERE id = $1',
        [input.id]
      );

      console.log('🔍 [DELETE SUBSCRIPTION PLAN] Resultado de búsqueda:', checkResult.rows);

      if (checkResult.rows.length === 0) {
        console.error('❌ [DELETE SUBSCRIPTION PLAN] Tarifa no encontrada:', input.id);
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tarifa no encontrada',
        });
      }

      console.log('🔄 [DELETE SUBSCRIPTION PLAN] Desvinculando restaurantes...');
      const updateResult = await ctx.db.query(
        'UPDATE restaurants SET subscription_plan_id = NULL WHERE subscription_plan_id = $1',
        [input.id]
      );
      console.log('✅ [DELETE SUBSCRIPTION PLAN] Restaurantes actualizados:', updateResult.rowCount);

      console.log('🗑️ [DELETE SUBSCRIPTION PLAN] Eliminando plan...');
      const result = await ctx.db.query(
        'DELETE FROM subscription_plans WHERE id = $1 RETURNING id',
        [input.id]
      );

      console.log('✅ [DELETE SUBSCRIPTION PLAN] Tarifa eliminada:', {
        id: input.id,
        rowsAffected: result.rowCount,
        deleted: result.rows
      });

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [DELETE SUBSCRIPTION PLAN] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar la tarifa: ${error.message}`,
      });
    }
  });
