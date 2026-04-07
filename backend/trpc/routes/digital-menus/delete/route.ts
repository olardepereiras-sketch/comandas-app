import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteDigitalMenuProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE DIGITAL MENU]', input.id);
    await ctx.db.query(`DELETE FROM menu_items WHERE category_id IN (SELECT id FROM menu_categories WHERE menu_id = $1)`, [input.id]);
    await ctx.db.query(`DELETE FROM menu_categories WHERE menu_id = $1`, [input.id]);
    await ctx.db.query(`DELETE FROM digital_menus WHERE id = $1`, [input.id]);
    console.log('✅ [DELETE DIGITAL MENU]', input.id);
    return { success: true };
  });
