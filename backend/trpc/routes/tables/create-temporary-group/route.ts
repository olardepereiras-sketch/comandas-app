import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createTemporaryTableGroupProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      reservationId: z.string(),
      locationId: z.string(),
      tableIds: z.array(z.string()),
      guests: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE TEMPORARY GROUP] Creando grupo temporal de mesas:', input);
    
    try {
      const groupId = `temp-group-${Date.now()}`;
      const groupName = `Grupo Temporal ${input.tableIds.length} mesas`;
      
      const tablesResult = await ctx.db.query(
        'SELECT SUM(min_capacity) as total_min, SUM(max_capacity) as total_max FROM tables WHERE id = ANY($1::text[])',
        [input.tableIds]
      );
      
      const totalMin = tablesResult.rows[0]?.total_min || input.guests;
      const totalMax = tablesResult.rows[0]?.total_max || input.guests;
      
      await ctx.db.query(
        `INSERT INTO table_groups (id, restaurant_id, name, location_id, table_ids, min_capacity, max_capacity, priority, is_temporary, linked_reservation_id, created_at)
         VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10, NOW())`,
        [groupId, input.restaurantId, groupName, input.locationId, input.tableIds, totalMin, totalMax, 5, true, input.reservationId]
      );
      
      console.log('✅ [CREATE TEMPORARY GROUP] Grupo temporal creado:', groupId);
      
      return { 
        success: true, 
        groupId,
        tableIds: input.tableIds 
      };
    } catch (error: any) {
      console.error('❌ [CREATE TEMPORARY GROUP] Error:', error);
      throw new Error(`Error al crear grupo temporal: ${error.message}`);
    }
  });
