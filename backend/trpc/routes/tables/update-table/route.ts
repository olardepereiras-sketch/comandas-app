import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Table } from '@/types';

export const updateTableProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'El nombre es requerido'),
      minCapacity: z.number().min(1),
      maxCapacity: z.number().min(1),
      allowsHighChairs: z.boolean(),
      allowsStrollers: z.boolean(),
      allowsPets: z.boolean(),
      priority: z.number().min(1).max(9),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE TABLE] Actualizando mesa:', input.id);
    
    try {
      const result = await ctx.db.query(
        `UPDATE tables SET name = $1, min_capacity = $2, max_capacity = $3, 
         allows_high_chairs = $4, allows_strollers = $5, allows_pets = $6, priority = $7 
         WHERE id = $8`,
        [
          input.name,
          input.minCapacity,
          input.maxCapacity,
          input.allowsHighChairs,
          input.allowsStrollers,
          input.allowsPets,
          input.priority,
          input.id,
        ]
      );
      
      console.log('✅ [UPDATE TABLE] UPDATE exitoso. Rows affected:', result.rowCount);
      
      const tableResult = await ctx.db.query(
        'SELECT * FROM tables WHERE id = $1',
        [input.id]
      );
      
      const row = tableResult.rows[0] as any;
      
      const updatedTable: Table = {
        id: row.id,
        locationId: row.location_id,
        restaurantId: row.restaurant_id,
        name: row.name,
        minCapacity: row.min_capacity,
        maxCapacity: row.max_capacity,
        allowsHighChairs: Boolean(row.allows_high_chairs),
        allowsStrollers: Boolean(row.allows_strollers),
        allowsPets: Boolean(row.allows_pets),
        priority: row.priority || 5,
        order: row.order_num,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
      
      return updatedTable;
    } catch (error: any) {
      console.error('❌ [UPDATE TABLE] Error en UPDATE:', error);
      throw error;
    }
  });
