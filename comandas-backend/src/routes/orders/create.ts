import { publicProcedure } from '../../context';
import { z } from 'zod';

export const createOrderProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    tableId: z.string().optional(),
    tableName: z.string(),
    locationId: z.string().optional(),
    locationName: z.string().optional(),
    guests: z.number().int().min(1).default(2),
    waiterName: z.string().optional(),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🟢 [COMANDAS] Crear orden - mesa:', input.tableName);

    const result = await ctx.db.query(
      `INSERT INTO comanda_orders
        (restaurant_id, table_id, table_name, location_id, location_name, guests, waiter_name, notes, status, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', 0)
       RETURNING *`,
      [
        input.restaurantId,
        input.tableId ?? null,
        input.tableName,
        input.locationId ?? null,
        input.locationName ?? null,
        input.guests,
        input.waiterName ?? null,
        input.notes ?? null,
      ]
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
      items: [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    };
  });
