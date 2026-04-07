import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateDigitalMenuProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    color: z.string().optional(),
    displayOrder: z.number().optional(),
    imageOrientation: z.enum(['horizontal', 'vertical']).optional(),
    showAllergenFilter: z.boolean().optional(),
    showDietaryFilter: z.boolean().optional(),
    customCharacteristics: z.array(z.object({
      id: z.string(),
      label: z.string(),
      emoji: z.string(),
      color: z.string(),
    })).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE DIGITAL MENU]', input);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
    if (input.color !== undefined) { fields.push(`color = $${idx++}`); values.push(input.color); }
    if (input.displayOrder !== undefined) { fields.push(`display_order = $${idx++}`); values.push(input.displayOrder); }
    if (input.imageOrientation !== undefined) { fields.push(`image_orientation = $${idx++}`); values.push(input.imageOrientation); }
    if (input.showAllergenFilter !== undefined) { fields.push(`show_allergen_filter = $${idx++}`); values.push(input.showAllergenFilter); }
    if (input.showDietaryFilter !== undefined) { fields.push(`show_dietary_filter = $${idx++}`); values.push(input.showDietaryFilter); }
    if (input.customCharacteristics !== undefined) { fields.push(`custom_characteristics = $${idx++}`); values.push(JSON.stringify(input.customCharacteristics)); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    await ctx.db.query(
      `UPDATE digital_menus SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    console.log('✅ [UPDATE DIGITAL MENU]', input.id);
    return { success: true };
  });
