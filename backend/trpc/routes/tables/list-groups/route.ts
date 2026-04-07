import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listTableGroupsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST TABLE GROUPS] Listando grupos de mesas:', input);
    
    const result = await ctx.db.query(
      'SELECT * FROM table_groups WHERE restaurant_id = $1 ORDER BY priority DESC',
      [input.restaurantId]
    );
    
    const groups = result.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      locationId: row.location_id || null,
      tableIds: Array.isArray(row.table_ids) ? row.table_ids : [],
      minCapacity: row.min_capacity,
      maxCapacity: row.max_capacity,
      priority: row.priority || 5,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
    
    console.log('✅ [LIST TABLE GROUPS] Grupos listados:', groups.length);
    
    return groups;
  });
