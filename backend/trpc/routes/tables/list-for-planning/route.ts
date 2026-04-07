import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Table } from '@/types';

export const listTablesForPlanningProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string().optional(),
      shiftTemplateId: z.string().optional(),
      shiftDate: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST TABLES FOR PLANNING] Listando mesas incluyendo temporales:', input);
    
    // NOTE: We intentionally do NOT exclude grouped table IDs from the SQL query.
    // The frontend locationTables memo handles hiding grouped tables unless they have
    // their own independent reservation (e.g. after rotation time has passed).
    // Excluding them from SQL would prevent them from reappearing after rotation time.
    
    const params: any[] = [input.restaurantId];
    let paramIndex = 2;
    
    let sql: string;
    
    if (input.shiftTemplateId && input.shiftDate) {
      sql = "SELECT * FROM tables WHERE restaurant_id = $1 AND (" +
        "(is_temporary IS NOT TRUE)" +
        " OR (is_temporary = TRUE AND shift_template_id = $" + paramIndex + " AND shift_date = $" + (paramIndex + 1) + ")" +
      ")";
      params.push(input.shiftTemplateId, input.shiftDate);
      paramIndex += 2;
    } else {
      sql = "SELECT * FROM tables WHERE restaurant_id = $1 AND (is_temporary IS NOT TRUE)";
    }
    
    if (input.locationId) {
      sql += ' AND location_id = $' + paramIndex;
      params.push(input.locationId);
      paramIndex++;
    }
    
    sql += ' ORDER BY order_num, is_temporary NULLS FIRST';
    
    console.log('🔵 [LIST TABLES FOR PLANNING] SQL:', sql);
    console.log('🔵 [LIST TABLES FOR PLANNING] Params:', params);
    
    const result = await ctx.db.query(sql, params);
    
    const filteredRows = result.rows.filter((row: any) => {
      if (!row.is_temporary) return true;
      
      if (input.shiftTemplateId && input.shiftDate) {
        const matches = row.shift_template_id === input.shiftTemplateId && row.shift_date === input.shiftDate;
        if (!matches) {
          console.log('[LIST TABLES FOR PLANNING] Filtrando mesa temporal que no coincide:', row.name);
        }
        return matches;
      }
      
      return false;
    });
    
    const tables = filteredRows.map((row: any): Table & { isTemporary?: boolean; originalTableId?: string; shiftTemplateId?: string; shiftDate?: string; groupedTableIds?: string[]; availableHighChairs?: number; allowsStroller?: boolean; rotationTimeMinutes?: number } => ({
      id: row.id,
      locationId: row.location_id,
      restaurantId: row.restaurant_id,
      name: row.name,
      minCapacity: row.min_capacity,
      maxCapacity: row.max_capacity,
      allowsHighChairs: Boolean(row.allows_high_chairs),
      allowsStrollers: Boolean(row.allows_strollers),
      allowsPets: Boolean(row.allows_pets),
      allowsStroller: Boolean(row.allows_strollers),
      availableHighChairs: row.available_high_chairs || 0,
      priority: row.priority || 5,
      order: row.order_num,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      isTemporary: Boolean(row.is_temporary),
      originalTableId: row.original_table_id || undefined,
      shiftTemplateId: row.shift_template_id || undefined,
      shiftDate: row.shift_date || undefined,
      groupedTableIds: row.grouped_table_ids ? (typeof row.grouped_table_ids === 'string' ? JSON.parse(row.grouped_table_ids) : row.grouped_table_ids) : undefined,
      rotationTimeMinutes: row.rotation_time_minutes || 120,
    }));
    
    const permanentCount = tables.filter(t => !t.isTemporary).length;
    const temporaryCount = tables.filter(t => t.isTemporary).length;
    console.log('✅ [LIST TABLES FOR PLANNING] Mesas:', permanentCount, 'permanentes,', temporaryCount, 'temporales');
    
    return tables;
  });
