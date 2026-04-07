import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const createDigitalMenuProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    name: z.string().min(1),
    color: z.string().default('#0EA5E9'),
    imageOrientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
    showAllergenFilter: z.boolean().default(true),
    showDietaryFilter: z.boolean().default(true),
    customCharacteristics: z.array(z.object({
      id: z.string(),
      label: z.string(),
      emoji: z.string(),
      color: z.string(),
    })).default([]),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE DIGITAL MENU]', input);

    const countResult = await ctx.db.query(
      `SELECT COUNT(*) as count FROM digital_menus WHERE restaurant_id = $1`,
      [input.restaurantId]
    );
    const count = parseInt(countResult.rows[0].count);
    if (count >= 4) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'El límite máximo de cartas digitales es 4',
      });
    }

    const id = `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await ctx.db.query(
      `INSERT INTO digital_menus (
        id, restaurant_id, name, color, image_orientation, display_order,
        show_allergen_filter, show_dietary_filter, custom_characteristics,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id, input.restaurantId, input.name, input.color, input.imageOrientation, count,
        input.showAllergenFilter, input.showDietaryFilter, JSON.stringify(input.customCharacteristics),
        now, now,
      ]
    );

    console.log('✅ [CREATE DIGITAL MENU] Creada:', id);
    return {
      id,
      name: input.name,
      color: input.color,
      imageOrientation: input.imageOrientation,
      showAllergenFilter: input.showAllergenFilter,
      showDietaryFilter: input.showDietaryFilter,
      customCharacteristics: input.customCharacteristics,
    };
  });
