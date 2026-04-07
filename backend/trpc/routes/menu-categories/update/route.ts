import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateMenuCategoryProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    color: z.string().optional(),
    position: z.number().optional(),
    isActive: z.boolean().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE MENU CATEGORY]', input);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
    if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
    if (input.imageUrl !== undefined) { fields.push(`image_url = $${idx++}`); values.push(input.imageUrl); }
    if (input.color !== undefined) { fields.push(`color = $${idx++}`); values.push(input.color); }
    if (input.position !== undefined) { fields.push(`position = $${idx++}`); values.push(input.position); }
    if (input.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(input.isActive); }
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    await ctx.db.query(
      `UPDATE menu_categories SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    console.log('✅ [UPDATE MENU CATEGORY]', input.id);
    return { success: true };
  });
