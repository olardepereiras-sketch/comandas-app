import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateTableGroupProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string(),
      locationId: z.string().optional(),
      tableIds: z.array(z.string()),
      minCapacity: z.number(),
      maxCapacity: z.number(),
      priority: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE TABLE GROUP] Actualizando grupo de mesas:', input);
    
    await ctx.db.query(
      `UPDATE table_groups 
       SET name = $1, location_id = $2, table_ids = $3, min_capacity = $4, max_capacity = $5, priority = $6
       WHERE id = $7`,
      [input.name, input.locationId || null, input.tableIds, input.minCapacity, input.maxCapacity, input.priority, input.id]
    );
    
    console.log('✅ [UPDATE TABLE GROUP] Grupo actualizado:', input.id);
    
    return { success: true };
  });
