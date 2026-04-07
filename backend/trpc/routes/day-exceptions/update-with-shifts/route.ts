import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateDayExceptionWithShiftsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      isOpen: z.boolean(),
      shifts: z.array(z.object({
        templateId: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        maxGuestsPerHour: z.number(),
        minRating: z.number(),
        minLocalRating: z.number().optional(),
      })).optional(),
      notes: z.string().optional(),
      specialDayMessage: z.string().optional(),
      specialMessageEnabled: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      let dateOnly: string;
      
      if (input.date.includes('T')) {
        const inputDate = new Date(input.date);
        const localYear = inputDate.getFullYear();
        const localMonth = String(inputDate.getMonth() + 1).padStart(2, '0');
        const localDay = String(inputDate.getDate()).padStart(2, '0');
        dateOnly = `${localYear}-${localMonth}-${localDay}`;
        console.log('📅 [UPDATE DAY] Fecha con T:', {
          input: input.date,
          parsed: inputDate.toISOString(),
          local: inputDate.toString(),
          result: dateOnly
        });
      } else {
        dateOnly = input.date;
        console.log('📅 [UPDATE DAY] Fecha sin T:', dateOnly);
      }
      
      console.log('🔵 [UPDATE DAY EXCEPTION WITH SHIFTS] Actualizando excepción con turnos:', {
        restaurantId: input.restaurantId,
        date: dateOnly,
        isOpen: input.isOpen,
        shiftsCount: input.shifts?.length || 0,
      });
      console.log('🔍 [UPDATE DAY EXCEPTION] Fecha que se guardará:', dateOnly);

      console.log('🔍 [UPDATE DAY] Buscando excepción existente...');
      const existingException = await ctx.db.query(
        'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
        [input.restaurantId, dateOnly]
      );
      console.log('🔍 [UPDATE DAY] Excepciones encontradas:', existingException.rows.length);

      const now = new Date();
      
      const validShifts = (input.shifts || []).filter(s => s.templateId);
      const shiftsData = JSON.stringify(validShifts);

      console.log('🔍 [UPDATE DAY EXCEPTION] Shifts válidos:', validShifts.length, 'de', (input.shifts || []).length);

      if (existingException.rows.length > 0) {
        console.log('🔄 [UPDATE DAY] Actualizando excepción existente:', existingException.rows[0].id);
        const updateResult = await ctx.db.query(
          `UPDATE day_exceptions 
           SET is_open = $1, template_ids = $2, notes = $3, updated_at = $4,
               special_day_message = $5, special_message_enabled = $6
           WHERE id = $7
           RETURNING *`,
          [
            input.isOpen,
            shiftsData,
            input.notes || null,
            now,
            input.specialDayMessage || null,
            input.specialMessageEnabled || false,
            existingException.rows[0].id,
          ]
        );
        console.log('✅ [UPDATE DAY] UPDATE ejecutado, filas afectadas:', updateResult.rowCount);

        console.log('✅ [UPDATE DAY EXCEPTION WITH SHIFTS] Excepción actualizada:', {
          id: existingException.rows[0].id,
          isOpen: input.isOpen,
          shifts: validShifts.length,
        });

        const updated = await ctx.db.query(
          'SELECT * FROM day_exceptions WHERE id = $1',
          [existingException.rows[0].id]
        );

        const row = updated.rows[0];
        let dateValue = row.date;
        
        console.log('🔍 [UPDATE DAY] Fecha leída de DB:', {
          raw: row.date,
          type: typeof row.date,
          constructor: row.date?.constructor?.name
        });
        
        if (row.date instanceof Date) {
          const year = row.date.getFullYear();
          const month = String(row.date.getMonth() + 1).padStart(2, '0');
          const day = String(row.date.getDate()).padStart(2, '0');
          dateValue = `${year}-${month}-${day}`;
          console.log('📅 [UPDATE DAY] Fecha es Date, convertida a:', dateValue);
        } else if (typeof row.date === 'string') {
          if (row.date.includes('T')) {
            dateValue = row.date.split('T')[0];
          } else if (row.date.includes('GMT') || row.date.includes('(')) {
            console.error('❌ [UPDATE DAY] PROBLEMA: Fecha guardada como string con formato toString()');
            const parsedDate = new Date(row.date);
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
          } else {
            dateValue = row.date;
          }
          console.log('📅 [UPDATE DAY] Fecha es string, convertida a:', dateValue);
        }

        return {
          id: row.id,
          restaurantId: row.restaurant_id,
          date: dateValue,
          isOpen: Boolean(row.is_open),
          shifts: validShifts,
          notes: row.notes,
          specialDayMessage: row.special_day_message,
          specialMessageEnabled: Boolean(row.special_message_enabled),
          updatedAt: new Date(row.updated_at),
        };
      } else {
        console.log('➕ [UPDATE DAY] Creando nueva excepción...');
        const id = `day-exception-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const insertResult = await ctx.db.query(
          `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, notes, special_day_message, special_message_enabled, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            id,
            input.restaurantId,
            dateOnly,
            input.isOpen,
            shiftsData,
            input.notes || null,
            input.specialDayMessage || null,
            input.specialMessageEnabled || false,
            now,
            now,
          ]
        );
        console.log('✅ [UPDATE DAY] INSERT ejecutado, filas insertadas:', insertResult.rowCount);

        console.log('✅ [UPDATE DAY EXCEPTION WITH SHIFTS] Excepción creada:', {
          id,
          date: dateOnly,
          isOpen: input.isOpen,
          shifts: validShifts.length,
        });

        return {
          id,
          restaurantId: input.restaurantId,
          date: dateOnly,
          isOpen: input.isOpen,
          shifts: validShifts,
          notes: input.notes,
          specialDayMessage: input.specialDayMessage,
          specialMessageEnabled: input.specialMessageEnabled,
          createdAt: now,
          updatedAt: now,
        };
      }
    } catch (error) {
      console.error('❌ [UPDATE DAY EXCEPTION] Error:', error);
      throw error;
    }
  });
