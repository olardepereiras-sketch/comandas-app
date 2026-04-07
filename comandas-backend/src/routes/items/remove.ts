import { publicProcedure } from '../../context';
import { z } from 'zod';

export const removeItemProcedure = publicProcedure
  .input(z.object({
    itemId: z.string(),
    orderId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔴 [COMANDAS] Eliminar item:', input.itemId);

    await ctx.db.query(
      `DELETE FROM comanda_order_items WHERE id = $1`,
      [input.itemId]
    );

    await ctx.db.query(
      `UPDATE comanda_orders
       SET total_amount = (
         SELECT COALESCE(SUM(price * quantity), 0) FROM comanda_order_items WHERE order_id = $1
       ), updated_at = NOW()
       WHERE id = $1`,
      [input.orderId]
    );

    return { success: true };
  });
