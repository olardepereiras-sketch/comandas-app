import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listMenuItemsProcedure = publicProcedure
  .input(z.object({ categoryId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST MENU ITEMS] categoryId:', input.categoryId);

    const result = await ctx.db.query(
      `SELECT id, category_id, name, description, image_url, price, allergens, dietary_preferences,
              price2_enabled, price2_name, price2_amount,
              price3_enabled, price3_name, price3_amount,
              display_order, is_active, created_at, updated_at
       FROM menu_items
       WHERE category_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [input.categoryId]
    );

    return result.rows.map((row: any) => ({
      id: String(row.id),
      categoryId: String(row.category_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      price: Number(row.price),
      allergens: Array.isArray(row.allergens) ? row.allergens : (typeof row.allergens === 'string' ? JSON.parse(row.allergens) : []),
      dietaryPreferences: Array.isArray(row.dietary_preferences) ? row.dietary_preferences : (typeof row.dietary_preferences === 'string' ? JSON.parse(row.dietary_preferences) : []),
      price2Enabled: Boolean(row.price2_enabled),
      price2Name: row.price2_name ? String(row.price2_name) : null,
      price2Amount: row.price2_amount ? Number(row.price2_amount) : null,
      price3Enabled: Boolean(row.price3_enabled),
      price3Name: row.price3_name ? String(row.price3_name) : null,
      price3Amount: row.price3_amount ? Number(row.price3_amount) : null,
      displayOrder: Number(row.display_order),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  });
