import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteMenuCategoryProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE MENU CATEGORY]', input.id);
    await ctx.db.query(`DELETE FROM menu_categories WHERE id = $1`, [input.id]);
    console.log('✅ [DELETE MENU CATEGORY]', input.id);
    return { success: true };
  });
