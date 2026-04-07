import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const checkOrderProcedure = publicProcedure
  .input(
    z.object({
      orderId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [CHECK ORDER] Verificando orden:', input.orderId);

    try {
      const result = await ctx.db.query(
        'SELECT id, status, restaurant_id FROM subscription_orders WHERE id = $1',
        [input.orderId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Orden no encontrada',
        });
      }

      const order = result.rows[0];

      return {
        status: order.status,
        restaurantId: order.restaurant_id,
        isCompleted: order.status === 'completed',
      };
    } catch (error: any) {
      console.error('❌ [CHECK ORDER] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al verificar orden: ${error.message}`,
      });
    }
  });
