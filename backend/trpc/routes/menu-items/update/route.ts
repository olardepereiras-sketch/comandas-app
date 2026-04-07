import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateMenuItemProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    price: z.number().min(0).optional(),
    allergens: z.array(z.string()).optional(),
    dietaryPreferences: z.array(z.string()).optional(),
    price2Enabled: z.boolean().optional(),
    price2Name: z.string().nullable().optional(),
    price2Amount: z.number().nullable().optional(),
    price3Enabled: z.boolean().optional(),
    price3Name: z.string().nullable().optional(),
    price3Amount: z.number().nullable().optional(),
    displayOrder: z.number().optional(),
    isActive: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE MENU ITEM]', input.id);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
    if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
    if (input.imageUrl !== undefined) { fields.push(`image_url = $${idx++}`); values.push(input.imageUrl); }
    if (input.price !== undefined) { fields.push(`price = $${idx++}`); values.push(input.price); }
    if (input.allergens !== undefined) { fields.push(`allergens = $${idx++}`); values.push(JSON.stringify(input.allergens)); }
    if (input.dietaryPreferences !== undefined) { fields.push(`dietary_preferences = $${idx++}`); values.push(JSON.stringify(input.dietaryPreferences)); }
    if (input.price2Enabled !== undefined) { fields.push(`price2_enabled = $${idx++}`); values.push(input.price2Enabled); }
    if (input.price2Name !== undefined) { fields.push(`price2_name = $${idx++}`); values.push(input.price2Name); }
    if (input.price2Amount !== undefined) { fields.push(`price2_amount = $${idx++}`); values.push(input.price2Amount); }
    if (input.price3Enabled !== undefined) { fields.push(`price3_enabled = $${idx++}`); values.push(input.price3Enabled); }
    if (input.price3Name !== undefined) { fields.push(`price3_name = $${idx++}`); values.push(input.price3Name); }
    if (input.price3Amount !== undefined) { fields.push(`price3_amount = $${idx++}`); values.push(input.price3Amount); }
    if (input.displayOrder !== undefined) { fields.push(`display_order = $${idx++}`); values.push(input.displayOrder); }
    if (input.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(input.isActive); }
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    await ctx.db.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    console.log('✅ [UPDATE MENU ITEM]', input.id);
    return { success: true };
  });
