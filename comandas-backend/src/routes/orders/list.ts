import { publicProcedure } from '../../context';
import { z } from 'zod';

export const listOrdersProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    status: z.enum(['open', 'closed', 'cancelled', 'all']).default('open'),
  }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [COMANDAS] Listar órdenes - restaurantId:', input.restaurantId);

    const whereStatus = input.status === 'all' ? '' : `AND o.status = '${input.status}'`;

    const ordersResult = await ctx.db.query(
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
                  'status', i.status,
                  'createdAt', i.created_at,
                  'updatedAt', i.updated_at
                ) ORDER BY i.created_at ASC
              ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM comanda_orders o
       LEFT JOIN comanda_order_items i ON i.order_id = o.id
       WHERE o.restaurant_id = $1 ${whereStatus}
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [input.restaurantId]
    );

    return ordersResult.rows.map((row: any) => ({
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
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })) : [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    }));
  });
