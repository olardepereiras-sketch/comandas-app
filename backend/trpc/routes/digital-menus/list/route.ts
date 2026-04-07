import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listDigitalMenusProcedure = publicProcedure
  .input(z.object({ restaurantId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST DIGITAL MENUS] restaurantId:', input.restaurantId);

    const result = await ctx.db.query(
      `SELECT id, restaurant_id, name, color, image_orientation, display_order,
              show_allergen_filter, show_dietary_filter, custom_characteristics,
              created_at, updated_at
       FROM digital_menus
       WHERE restaurant_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [input.restaurantId]
    );

    return result.rows.map((row: any) => {
      let customCharacteristics = [];
      try {
        const raw = row.custom_characteristics;
        customCharacteristics = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
      } catch {
        customCharacteristics = [];
      }

      return {
        id: String(row.id),
        restaurantId: String(row.restaurant_id),
        name: String(row.name),
        color: String(row.color),
        imageOrientation: (row.image_orientation || 'horizontal') as 'horizontal' | 'vertical',
        displayOrder: Number(row.display_order),
        showAllergenFilter: row.show_allergen_filter !== false,
        showDietaryFilter: row.show_dietary_filter !== false,
        customCharacteristics,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    });
  });
