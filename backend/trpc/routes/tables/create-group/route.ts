import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createTableGroupProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      name: z.string(),
      locationId: z.string().optional(),
      tableIds: z.array(z.string()),
      minCapacity: z.number(),
      maxCapacity: z.number(),
      priority: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE TABLE GROUP] Creando grupo de mesas:', input);
    console.log('🔵 [CREATE TABLE GROUP] tableIds type:', typeof input.tableIds, 'isArray:', Array.isArray(input.tableIds));
    
    try {
      const groupId = `group-${Date.now()}`;
      
      console.log('🔵 [CREATE TABLE GROUP] Insertando en base de datos...');
      const result = await ctx.db.query(
        `INSERT INTO table_groups (id, restaurant_id, name, location_id, table_ids, min_capacity, max_capacity, priority, created_at)
         VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, NOW())
         RETURNING *`,
        [groupId, input.restaurantId, input.name, input.locationId || null, input.tableIds, input.minCapacity, input.maxCapacity, input.priority]
      );
      
      console.log('✅ [CREATE TABLE GROUP] Grupo creado exitosamente:', groupId);
      console.log('✅ [CREATE TABLE GROUP] Resultado:', result.rows[0]);
      
      return { id: groupId };
    } catch (error: any) {
      console.error('❌ [CREATE TABLE GROUP] Error al crear grupo:', error);
      console.error('❌ [CREATE TABLE GROUP] Error message:', error.message);
      console.error('❌ [CREATE TABLE GROUP] Error stack:', error.stack);
      throw new Error(`Error al crear grupo de mesas: ${error.message}`);
    }
  });
