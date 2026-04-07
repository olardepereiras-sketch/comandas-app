import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Table } from '@/types';

export const listTablesProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST TABLES] Listando mesas:', input);
    
    let sql = "SELECT * FROM tables WHERE restaurant_id = $1 AND (is_temporary IS NOT TRUE)";
    const params: any[] = [input.restaurantId];
    
    if (input.locationId) {
      sql += ' AND location_id = $2';
      params.push(input.locationId);
    }
    
    sql += ' ORDER BY order_num';
    
    const result = await ctx.db.query(sql, params);
    
    const tables = result.rows.map((row: any): Table => ({
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
    }));
    
    console.log('✅ [LIST TABLES] Mesas listadas:', tables.length);
    
    return tables;
  });
