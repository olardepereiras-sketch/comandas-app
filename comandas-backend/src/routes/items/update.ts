import { publicProcedure } from '../../context';
import { z } from 'zod';

export const updateItemProcedure = publicProcedure
  .input(z.object({
    itemId: z.string(),
    orderId: z.string(),
    quantity: z.number().int().min(1).optional(),
    status: z.enum(['pending', 'preparing', 'ready', 'served']).optional(),
    notes: z.string().optional(),
    course: z.enum(['starter', 'main', 'dessert', 'drink', 'other']).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🟡 [COMANDAS] Actualizar item:', input.itemId, 'status:', input.status);

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [input.itemId];
    let idx = 2;

    if (input.quantity !== undefined) { sets.push(`quantity = $${idx++}`); params.push(input.quantity); }
    if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
    if (input.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(input.notes); }
    if (input.course !== undefined) { sets.push(`course = $${idx++}`); params.push(input.course); }

    await ctx.db.query(
      `UPDATE comanda_order_items SET ${sets.join(', ')} WHERE id = $1`,
      params
    );

    await ctx.db.query(
      `UPDATE comanda_orders
       SET total_amount = (
         SELECT COALESCE(SUM(price * quantity), 0) FROM comanda_order_items WHERE order_id = $1
       ), updated_at = NOW()
       WHERE id = $1`,
      [input.orderId]
    );

    const result = await ctx.db.query(
      `SELECT * FROM comanda_order_items WHERE id = $1`,
      [input.itemId]
    );
    const row = result.rows[0];
    return {
      id: String(row.id),
      orderId: String(row.order_id),
      menuItemId: row.menu_item_id ? String(row.menu_item_id) : null,
      name: String(row.name),
      price: Number(row.price),
      priceVariant: String(row.price_variant),
      priceVariantName: row.price_variant_name ? String(row.price_variant_name) : null,
      quantity: Number(row.quantity),
      notes: row.notes ? String(row.notes) : null,
      course: String(row.course),
      status: String(row.status),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  });
