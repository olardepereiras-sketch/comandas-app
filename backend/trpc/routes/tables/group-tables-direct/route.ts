import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const groupTablesDirectProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string(),
      tableIds: z.array(z.string()).min(2),
      shiftTemplateId: z.string(),
      shiftDate: z.string(),
      groupName: z.string().optional(),
      customMinCapacity: z.number().optional(),
      customMaxCapacity: z.number().optional(),
      excludeReservationId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [GROUP TABLES DIRECT] Agrupando mesas directamente:', input);
    
    try {
      // Obtener el rango de horas del turno para verificar bloqueos correctamente
      const shiftTemplateResult = await ctx.db.query(
        `SELECT times FROM shift_templates WHERE id = $1`,
        [input.shiftTemplateId]
      );
      
      let shiftStartHour = 0;
      let shiftEndHour = 24;
      
      if (shiftTemplateResult.rows.length > 0) {
        const template = shiftTemplateResult.rows[0];
        const times = typeof template.times === 'string' ? JSON.parse(template.times) : (template.times || []);
        if (Array.isArray(times) && times.length > 0) {
          const sortedTimes = [...times].sort((a: string, b: string) => a.localeCompare(b));
          const firstTime = sortedTimes[0];
          const lastTime = sortedTimes[sortedTimes.length - 1];
          if (firstTime) {
            const [h] = firstTime.split(':').map(Number);
            shiftStartHour = h;
          }
          if (lastTime) {
            const [h] = lastTime.split(':').map(Number);
            shiftEndHour = h + 2;
          }
        }
      }
      
      // Calcular el rango de tiempo del turno para la fecha especificada
      const shiftDate = new Date(input.shiftDate);
      const shiftStartTime = new Date(shiftDate);
      shiftStartTime.setHours(shiftStartHour, 0, 0, 0);
      const shiftEndTime = new Date(shiftDate);
      shiftEndTime.setHours(shiftEndHour, 0, 0, 0);
      
      console.log('🔵 [GROUP TABLES DIRECT] Rango del turno:', {
        shiftStartTime: shiftStartTime.toISOString(),
        shiftEndTime: shiftEndTime.toISOString(),
      });
      
      // Verificar que todas las mesas existen y no están bloqueadas para este turno
      for (const tableId of input.tableIds) {
        const tableResult = await ctx.db.query(
          'SELECT * FROM tables WHERE id = $1 AND restaurant_id = $2',
          [tableId, input.restaurantId]
        );
        
        if (tableResult.rows.length === 0) {
          throw new Error(`Mesa ${tableId} no encontrada`);
        }
        
        const isTemporaryTable = Boolean(tableResult.rows[0].is_temporary);
        
        // Solo verificar bloqueos en mesas permanentes (las temporales ya están controladas por su estructura)
        if (!isTemporaryTable) {
          const blockCheck = await ctx.db.query(
            `SELECT id FROM table_blocks 
             WHERE table_id = $1 AND restaurant_id = $2 
             AND start_time < $3 AND end_time > $4`,
            [tableId, input.restaurantId, shiftEndTime, shiftStartTime]
          );
          
          if (blockCheck.rows.length > 0) {
            const table = tableResult.rows[0];
            throw new Error(`No se puede agrupar: la mesa ${table.name} está bloqueada para este turno`);
          }
        }
        
        // Verificar que no tiene reservas para este turno específico
        // Si se proporciona excludeReservationId, ignorar esa reserva (permite agrupar la mesa de una reserva existente)
        const reservationCheckParams: any[] = [input.restaurantId, input.shiftDate, tableId, shiftStartHour, shiftEndHour];
        let reservationCheckQuery = `SELECT r.id FROM reservations r
           WHERE r.restaurant_id = $1 
           AND DATE(r.date) = $2
           AND r.status NOT IN ('cancelled', 'modified')
           AND r.table_ids::jsonb ? $3
           AND COALESCE((r.time::json->>'hour')::int, 0) >= $4
           AND COALESCE((r.time::json->>'hour')::int, 24) < $5`;
        if (input.excludeReservationId) {
          reservationCheckQuery += ` AND r.id != $6`;
          reservationCheckParams.push(input.excludeReservationId);
        }
        const reservationCheck = await ctx.db.query(reservationCheckQuery, reservationCheckParams);
        
        if (reservationCheck.rows.length > 0) {
          const table = tableResult.rows[0];
          throw new Error(`No se puede agrupar: la mesa ${table.name} tiene una reserva en este turno`);
        }
      }
      
      // Obtener información de las mesas para calcular capacidad
      const tablesResult = await ctx.db.query(
        'SELECT id, name, min_capacity, max_capacity, allows_high_chairs, available_high_chairs, allows_strollers, allows_pets FROM tables WHERE id = ANY($1::text[])',
        [input.tableIds]
      );
      
      const tables = tablesResult.rows;
      const tableNames = tables.map((t: any) => t.name).join(' + ');
      const calculatedMinCapacity = tables.reduce((sum: number, t: any) => sum + (t.min_capacity || 1), 0);
      const calculatedMaxCapacity = tables.reduce((sum: number, t: any) => sum + (t.max_capacity || 2), 0);
      const totalMinCapacity = input.customMinCapacity || calculatedMinCapacity;
      const totalMaxCapacity = input.customMaxCapacity || calculatedMaxCapacity;
      console.log('🔵 [GROUP TABLES DIRECT] Capacidades:', { calculatedMin: calculatedMinCapacity, calculatedMax: calculatedMaxCapacity, customMin: input.customMinCapacity, customMax: input.customMaxCapacity, finalMin: totalMinCapacity, finalMax: totalMaxCapacity });
      const totalHighChairs = tables.reduce((sum: number, t: any) => sum + (t.available_high_chairs || 0), 0);
      const allowsStrollers = tables.every((t: any) => t.allows_strollers);
      const allowsPets = tables.every((t: any) => t.allows_pets);
      
      // Generar ID para el grupo temporal
      const timestamp = Date.now();
      const groupId = `temp-group-${timestamp}`;
      const groupName = input.groupName || `Grupo ${tableNames}`;
      
      // Crear mesa temporal que representa el grupo - con información del turno
      await ctx.db.query(
        `INSERT INTO tables (
          id, location_id, restaurant_id, name, 
          min_capacity, max_capacity, 
          allows_high_chairs, available_high_chairs,
          allows_strollers, allows_pets, 
          priority, order_num, created_at, is_active,
          is_temporary, grouped_table_ids, shift_template_id, shift_date
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), true, true, $13, $14, $15)`,
        [
          groupId,
          input.locationId,
          input.restaurantId,
          groupName,
          totalMinCapacity,
          totalMaxCapacity,
          totalHighChairs > 0,
          totalHighChairs,
          allowsStrollers,
          allowsPets,
          1,
          0,
          JSON.stringify(input.tableIds),
          input.shiftTemplateId,
          input.shiftDate
        ]
      );
      
      console.log('✅ [GROUP TABLES DIRECT] Grupo temporal creado:', groupId);
      
      // Bloquear las mesas permanentes para que no se puedan reservar individualmente
      // Las mesas temporales (divididas) ya están controladas por su estructura y NO necesitan bloqueo adicional
      for (const tableId of input.tableIds) {
        const tableCheck = await ctx.db.query(
          'SELECT is_temporary FROM tables WHERE id = $1',
          [tableId]
        );
        const isTempTable = Boolean(tableCheck.rows[0]?.is_temporary);
        
        if (isTempTable) {
          console.log('⏭️ [GROUP TABLES DIRECT] Mesa temporal omitida en bloqueo (ya controlada por estructura):', tableId);
          continue;
        }
        
        const blockId = `block-group-${tableId}-${timestamp}`;
        
        await ctx.db.query(
          `INSERT INTO table_blocks (id, restaurant_id, table_id, location_id, start_time, end_time, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            blockId,
            input.restaurantId,
            tableId,
            input.locationId,
            shiftStartTime,
            shiftEndTime,
            Math.round((shiftEndTime.getTime() - shiftStartTime.getTime()) / (1000 * 60))
          ]
        );
        console.log('✅ [GROUP TABLES DIRECT] Mesa original bloqueada:', tableId);
      }
      
      console.log('✅ [GROUP TABLES DIRECT] Mesas originales bloqueadas para este turno:', input.tableIds);
      
      return {
        success: true,
        groupId,
        groupName,
        tableIds: input.tableIds,
        totalCapacity: totalMaxCapacity,
      };
    } catch (error: any) {
      console.error('❌ [GROUP TABLES DIRECT] Error:', error);
      throw new Error(`Error al agrupar mesas: ${error.message}`);
    }
  });
