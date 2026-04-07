import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createMenuCategoryProcedure = publicProcedure
  .input(z.object({
    menuId: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    color: z.string().default('#0EA5E9'),
    position: z.number().default(0),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE MENU CATEGORY]', input);

    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await ctx.db.query(
      `INSERT INTO menu_categories (id, menu_id, name, description, image_url, color, position, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, input.menuId, input.name, input.description || null, input.imageUrl || null, input.color, input.position, true, now, now]
    );

    console.log('✅ [CREATE MENU CATEGORY]', id);
    return { id, name: input.name };
  });
