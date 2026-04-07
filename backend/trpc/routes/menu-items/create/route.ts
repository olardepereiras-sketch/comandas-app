import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createMenuItemProcedure = publicProcedure
  .input(z.object({
    categoryId: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    price: z.number().min(0).default(0),
    allergens: z.array(z.string()).default([]),
    dietaryPreferences: z.array(z.string()).default([]),
    price2Enabled: z.boolean().default(false),
    price2Name: z.string().optional(),
    price2Amount: z.number().optional(),
    price3Enabled: z.boolean().default(false),
    price3Name: z.string().optional(),
    price3Amount: z.number().optional(),
    displayOrder: z.number().default(0),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE MENU ITEM]', input.name);

    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await ctx.db.query(
      `INSERT INTO menu_items (
        id, category_id, name, description, image_url, price, allergens, dietary_preferences,
        price2_enabled, price2_name, price2_amount,
        price3_enabled, price3_name, price3_amount,
        display_order, is_active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id, input.categoryId, input.name,
        input.description || null, input.imageUrl || null,
        input.price, JSON.stringify(input.allergens), JSON.stringify(input.dietaryPreferences),
        input.price2Enabled, input.price2Name || null, input.price2Amount || null,
        input.price3Enabled, input.price3Name || null, input.price3Amount || null,
        input.displayOrder, true, now, now,
      ]
    );

    console.log('✅ [CREATE MENU ITEM]', id);
    return { id, name: input.name };
  });
