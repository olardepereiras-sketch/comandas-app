import { publicProcedure } from '../../context';
import { z } from 'zod';

export const addItemProcedure = publicProcedure
  .input(z.object({
    orderId: z.string(),
    menuItemId: z.string().optional(),
    name: z.string(),
    price: z.number(),
    priceVariant: z.enum(['price1', 'price2', 'price3']).default('price1'),
    priceVariantName: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional(),
    course: z.enum(['starter', 'main', 'dessert', 'drink', 'other']).default('main'),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🟢 [COMANDAS] Añadir item:', input.name, 'a orden:', input.orderId);

    const result = await ctx.db.query(
      `INSERT INTO comanda_order_items
        (order_id, menu_item_id, name, price, price_variant, price_variant_name, quantity, notes, course, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [
        input.orderId,
        input.menuItemId ?? null,
        input.name,
        input.price,
        input.priceVariant,
        input.priceVariantName ?? null,
        input.quantity,
        input.notes ?? null,
        input.course,
      ]
    );

    await ctx.db.query(
      `UPDATE comanda_orders
       SET total_amount = (
         SELECT COALESCE(SUM(price * quantity), 0) FROM comanda_order_items WHERE order_id = $1
       ), updated_at = NOW()
       WHERE id = $1`,
      [input.orderId]
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
