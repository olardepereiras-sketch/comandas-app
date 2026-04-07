import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createSplitTableProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      reservationId: z.string(),
      originalTableId: z.string(),
      originalTableNewCapacity: z.number(),
      originalTableHighChairs: z.number(),
      originalTableAllowsStroller: z.boolean(),
      originalTableAllowsPets: z.boolean(),
      splitTableCapacity: z.number(),
      splitTableHighChairs: z.number(),
      splitTableAllowsStroller: z.boolean(),
      splitTableAllowsPets: z.boolean(),
      shiftTemplateId: z.string().optional(),
      shiftDate: z.string().optional(),
      selectedTable: z.enum(['A', 'B']).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE SPLIT TABLE] Dividiendo mesa:', input);
    
    try {
      const originalTableResult = await ctx.db.query(
        'SELECT * FROM tables WHERE id = $1',
        [input.originalTableId]
      );
      
      if (originalTableResult.rows.length === 0) {
        throw new Error('Mesa original no encontrada');
      }
      
      const originalTable = originalTableResult.rows[0];
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 6);
      
      const tableAId = `${input.originalTableId}-A-${timestamp}-${randomSuffix}`;
      const tableBId = `${input.originalTableId}-B-${timestamp}-${randomSuffix}`;
      const tableAName = `${originalTable.name}A`;
      const tableBName = `${originalTable.name}B`;
      
      const shiftTemplateId = input.shiftTemplateId || null;
      const shiftDate = input.shiftDate || null;
      
      await ctx.db.query(
        `INSERT INTO tables (
          id, location_id, restaurant_id, name, 
          min_capacity, max_capacity, 
          allows_high_chairs, available_high_chairs,
          allows_strollers, allows_pets, 
          priority, order_num, created_at, is_active,
          is_temporary, original_table_id, shift_template_id, shift_date
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), true, true, $13, $14, $15)`,
        [
          tableAId,
          originalTable.location_id,
          input.restaurantId,
          tableAName,
          1,
          input.originalTableNewCapacity,
          input.originalTableHighChairs > 0,
          input.originalTableHighChairs,
          input.originalTableAllowsStroller,
          input.originalTableAllowsPets,
          originalTable.priority || 5,
          originalTable.order_num,
          input.originalTableId,
          shiftTemplateId,
          shiftDate
        ]
      );
      
      console.log('✅ [CREATE SPLIT TABLE] Mesa temporal A creada:', tableAId, tableAName);
      
      await ctx.db.query(
        `INSERT INTO tables (
          id, location_id, restaurant_id, name, 
          min_capacity, max_capacity, 
          allows_high_chairs, available_high_chairs,
          allows_strollers, allows_pets, 
          priority, order_num, created_at, is_active,
          is_temporary, original_table_id, shift_template_id, shift_date
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), true, true, $13, $14, $15)`,
        [
          tableBId,
          originalTable.location_id,
          input.restaurantId,
          tableBName,
          1,
          input.splitTableCapacity,
          input.splitTableHighChairs > 0,
          input.splitTableHighChairs,
          input.splitTableAllowsStroller,
          input.splitTableAllowsPets,
          originalTable.priority || 5,
          originalTable.order_num,
          input.originalTableId,
          shiftTemplateId,
          shiftDate
        ]
      );
      
      console.log('✅ [CREATE SPLIT TABLE] Mesa temporal B creada:', tableBId, tableBName);
      
      const blockId = `block-split-${timestamp}-${randomSuffix}`;
      const blockDate = shiftDate ? new Date(shiftDate) : new Date();
      const blockStart = new Date(blockDate);
      blockStart.setHours(0, 0, 0, 0);
      const blockEnd = new Date(blockDate);
      blockEnd.setHours(23, 59, 59, 999);
      
      await ctx.db.query(
        `INSERT INTO table_blocks (id, restaurant_id, table_id, location_id, start_time, end_time, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [
          blockId,
          input.restaurantId,
          input.originalTableId,
          originalTable.location_id,
          blockStart,
          blockEnd,
          1440
        ]
      );
      
      console.log('✅ [CREATE SPLIT TABLE] Mesa original bloqueada:', input.originalTableId);
      
      const selected = input.selectedTable || 'A';
      const selectedTableId = selected === 'A' ? tableAId : tableBId;
      const selectedTableName = selected === 'A' ? tableAName : tableBName;
      const freeTableId = selected === 'A' ? tableBId : tableAId;
      const freeTableName = selected === 'A' ? tableBName : tableAName;
      
      console.log('✅ [CREATE SPLIT TABLE] Mesa dividida exitosamente. Seleccionada:', selectedTableName, '| Libre:', freeTableName);
      
      return { 
        success: true, 
        tableAId,
        tableAName,
        tableBId,
        tableBName,
        selectedTableId,
        selectedTableName,
        freeTableId,
        freeTableName,
        originalTableId: input.originalTableId,
        blockId,
      };
    } catch (error: any) {
      console.error('❌ [CREATE SPLIT TABLE] Error:', error);
      throw new Error(`Error al dividir mesa: ${error.message}`);
    }
  });
