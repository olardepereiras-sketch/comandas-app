import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listMenuCategoriesProcedure = publicProcedure
  .input(z.object({ menuId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST MENU CATEGORIES] menuId:', input.menuId);

    const result = await ctx.db.query(
      `SELECT id, menu_id, name, description, image_url, color, position, is_active, created_at, updated_at
       FROM menu_categories
       WHERE menu_id = $1
       ORDER BY position ASC, created_at ASC`,
      [input.menuId]
    );

    return result.rows.map((row: any) => ({
      id: String(row.id),
      menuId: String(row.menu_id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      imageUrl: row.image_url ? String(row.image_url) : null,
      color: String(row.color),
      position: Number(row.position),
      isActive: row.is_active !== false,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  });
