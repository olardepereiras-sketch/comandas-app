import { publicProcedure } from '../../context';
import { z } from 'zod';

export const updateOrderProcedure = publicProcedure
  .input(z.object({
    orderId: z.string(),
    status: z.enum(['open', 'closed', 'cancelled']).optional(),
    guests: z.number().int().min(1).optional(),
    waiterName: z.string().optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🟡 [COMANDAS] Actualizar orden:', input.orderId, 'status:', input.status);

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [input.orderId];
    let idx = 2;

    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      params.push(input.status);
      if (input.status === 'closed' || input.status === 'cancelled') {
        sets.push(`closed_at = NOW()`);
      }
    }
    if (input.guests !== undefined) { sets.push(`guests = $${idx++}`); params.push(input.guests); }
    if (input.waiterName !== undefined) { sets.push(`waiter_name = $${idx++}`); params.push(input.waiterName); }
    if (input.notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(input.notes); }

    await ctx.db.query(
      `UPDATE comanda_orders SET ${sets.join(', ')} WHERE id = $1`,
      params
    );

    const result = await ctx.db.query(
      `SELECT o.*,
              COALESCE(json_agg(
                json_build_object(
                  'id', i.id,
                  'menuItemId', i.menu_item_id,
                  'name', i.name,
                  'price', i.price,
                  'priceVariant', i.price_variant,
                  'priceVariantName', i.price_variant_name,
                  'quantity', i.quantity,
                  'notes', i.notes,
                  'course', i.course,
                  'status', i.status
                ) ORDER BY i.created_at ASC
              ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM comanda_orders o
       LEFT JOIN comanda_order_items i ON i.order_id = o.id
       WHERE o.id = $1 GROUP BY o.id`,
      [input.orderId]
    );

    const row = result.rows[0];
    return {
      id: String(row.id),
      restaurantId: String(row.restaurant_id),
      tableId: row.table_id ? String(row.table_id) : null,
      tableName: String(row.table_name),
      locationId: row.location_id ? String(row.location_id) : null,
      locationName: row.location_name ? String(row.location_name) : null,
      status: String(row.status),
      guests: Number(row.guests),
      notes: row.notes ? String(row.notes) : null,
      waiterName: row.waiter_name ? String(row.waiter_name) : null,
      totalAmount: Number(row.total_amount),
      items: Array.isArray(row.items) ? row.items.map((i: any) => ({
        id: String(i.id),
        menuItemId: i.menuItemId ? String(i.menuItemId) : null,
        name: String(i.name),
        price: Number(i.price),
        priceVariant: String(i.priceVariant),
        priceVariantName: i.priceVariantName ? String(i.priceVariantName) : null,
        quantity: Number(i.quantity),
        notes: i.notes ? String(i.notes) : null,
        course: String(i.course),
        status: String(i.status),
      })) : [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    };
  });
