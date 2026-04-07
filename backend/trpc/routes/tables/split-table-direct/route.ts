import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const splitTableDirectProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      originalTableId: z.string(),
      locationId: z.string(),
      shiftTemplateId: z.string(),
      shiftDate: z.string(),
      tableAMinCapacity: z.number().min(1).default(1),
      tableACapacity: z.number().min(1),
      tableAHighChairs: z.number().default(0),
      tableAAllowsStroller: z.boolean().default(true),
      tableAAllowsPets: z.boolean().default(false),
      tableBMinCapacity: z.number().min(1).default(1),
      tableBCapacity: z.number().min(1),
      tableBHighChairs: z.number().default(0),
      tableBAllowsStroller: z.boolean().default(true),
      tableBAllowsPets: z.boolean().default(false),
      shiftStartTime: z.string().optional(),
      shiftEndTime: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SPLIT TABLE DIRECT] Dividiendo mesa directamente:', input);
    
    try {
      // Verificar que la mesa original existe
      const originalTableResult = await ctx.db.query(
        'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
        [input.originalTableId, input.restaurantId]
      );
      
      if (originalTableResult.rows.length === 0) {
        throw new Error('Mesa original no encontrada');
      }
      
      const originalTable = originalTableResult.rows[0];
      
      // Verificar que la mesa no está bloqueada en este turno concreto
      const [shiftYear, shiftMonth, shiftDay] = input.shiftDate.split('-').map(Number);
      const shiftWindowStart = input.shiftStartTime
        ? (() => {
            const [startHour, startMinute] = input.shiftStartTime!.split(':').map(Number);
            return new Date(shiftYear, shiftMonth - 1, shiftDay, startHour, startMinute, 0);
          })()
        : new Date(shiftYear, shiftMonth - 1, shiftDay, 0, 0, 0);
      const shiftWindowEnd = input.shiftEndTime
        ? (() => {
            const [endHour, endMinute] = input.shiftEndTime!.split(':').map(Number);
            return new Date(shiftYear, shiftMonth - 1, shiftDay, endHour, endMinute, 0);
          })()
        : new Date(shiftYear, shiftMonth - 1, shiftDay, 23, 59, 59, 999);

      const blockCheck = await ctx.db.query(
        `SELECT id FROM table_blocks 
         WHERE table_id = $1
         AND restaurant_id = $2
         AND start_time < $3
         AND end_time > $4`,
        [input.originalTableId, input.restaurantId, shiftWindowEnd, shiftWindowStart]
      );
      
      if (blockCheck.rows.length > 0) {
        throw new Error('No se puede dividir una mesa bloqueada en este turno');
      }
      
      // Generar IDs para las nuevas mesas temporales
      const timestamp = Date.now();
      const tableAId = `${input.originalTableId}-A-${timestamp}`;
      const tableBId = `${input.originalTableId}-B-${timestamp}`;
      const tableAName = `${originalTable.name}A`;
      const tableBName = `${originalTable.name}B`;
      
      // Crear mesa temporal A - con información del turno para filtrado
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
          input.locationId,
          input.restaurantId,
          tableAName,
          input.tableAMinCapacity || 1,
          input.tableACapacity,
          input.tableAHighChairs > 0,
          input.tableAHighChairs,
          input.tableAAllowsStroller,
          input.tableAAllowsPets,
          originalTable.priority || 5,
          originalTable.order_num,
          input.originalTableId,
          input.shiftTemplateId,
          input.shiftDate
        ]
      );
      
      console.log('✅ [SPLIT TABLE DIRECT] Mesa temporal A creada:', tableAId);
      
      // Crear mesa temporal B - con información del turno para filtrado
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
          input.locationId,
          input.restaurantId,
          tableBName,
          input.tableBMinCapacity || 1,
          input.tableBCapacity,
          input.tableBHighChairs > 0,
          input.tableBHighChairs,
          input.tableBAllowsStroller,
          input.tableBAllowsPets,
          originalTable.priority || 5,
          originalTable.order_num,
          input.originalTableId,
          input.shiftTemplateId,
          input.shiftDate
        ]
      );
      
      console.log('✅ [SPLIT TABLE DIRECT] Mesa temporal B creada:', tableBId);
      
      // Bloquear la mesa original solo durante el turno específico
      const blockId = `block-split-${timestamp}`;
      const [bYear, bMonth, bDay] = [shiftYear, shiftMonth, shiftDay];
      let blockStart: Date;
      let blockEnd: Date;
      
      if (input.shiftStartTime && input.shiftEndTime) {
        const [startH, startM] = input.shiftStartTime.split(':').map(Number);
        const [endH, endM] = input.shiftEndTime.split(':').map(Number);
        blockStart = new Date(bYear, bMonth - 1, bDay, startH, startM, 0);
        
        // Obtener el tiempo de rotación de la mesa para calcular el fin del bloqueo
        const rotationResult = await ctx.db.query(
          'SELECT rotation_time_minutes FROM tables WHERE id = $1',
          [input.originalTableId]
        );
        const rotationMinutes = rotationResult.rows[0]?.rotation_time_minutes || 120;
        
        // El bloqueo termina al final del turno, nunca más allá
        const shiftEnd = new Date(bYear, bMonth - 1, bDay, endH, endM, 0);
        blockEnd = shiftEnd;
        
        console.log(`🔒 [SPLIT TABLE DIRECT] Bloqueo limitado al turno: ${input.shiftStartTime} - ${input.shiftEndTime} (rotación: ${rotationMinutes}min)`);
      } else {
        // Sin horario de turno, usar solo las horas del día actual como fallback
        // pero NUNCA todo el día - usar un bloqueo de 4 horas máximo como seguridad
        const now = new Date();
        blockStart = new Date(bYear, bMonth - 1, bDay, now.getHours(), now.getMinutes(), 0);
        blockEnd = new Date(blockStart.getTime() + 4 * 60 * 60 * 1000); // máximo 4 horas
        
        // Asegurarse de que no pase de medianoche
        const midnight = new Date(bYear, bMonth - 1, bDay, 23, 59, 59);
        if (blockEnd > midnight) blockEnd = midnight;
        
        console.log(`🔒 [SPLIT TABLE DIRECT] Sin horario de turno, bloqueo limitado: ${blockStart.toISOString()} - ${blockEnd.toISOString()}`);
      }
      
      const durationMinutes = Math.round((blockEnd.getTime() - blockStart.getTime()) / (1000 * 60));
      
      await ctx.db.query(
        `INSERT INTO table_blocks (id, restaurant_id, table_id, location_id, start_time, end_time, duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          blockId,
          input.restaurantId,
          input.originalTableId,
          input.locationId,
          blockStart,
          blockEnd,
          durationMinutes
        ]
      );
      
      console.log('✅ [SPLIT TABLE DIRECT] Mesa original bloqueada');
      
      return {
        success: true,
        tableAId,
        tableAName,
        tableBId,
        tableBName,
        originalTableId: input.originalTableId,
        blockId,
      };
    } catch (error: any) {
      console.error('❌ [SPLIT TABLE DIRECT] Error:', error);
      throw new Error(`Error al dividir mesa: ${error.message}`);
    }
  });
