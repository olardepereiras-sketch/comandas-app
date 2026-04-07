import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listDayExceptionsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST DAY EXCEPTIONS] Listando excepciones:', input);

    let query = 'SELECT * FROM day_exceptions WHERE restaurant_id = $1';
    const values: any[] = [input.restaurantId];

    if (input.startDate && input.endDate) {
      query += ' AND date BETWEEN $2 AND $3';
      values.push(input.startDate, input.endDate);
    }

    query += ' ORDER BY date';

    const result = await ctx.db.query(query, values);

    const exceptions = result.rows.map((row: any) => {
      let shifts = [];
      try {
        const templateIds = typeof row.template_ids === 'string' 
          ? JSON.parse(row.template_ids) 
          : row.template_ids;
        
        // Si es array de objetos (shifts completos), usarlo directamente
        if (Array.isArray(templateIds) && templateIds.length > 0 && typeof templateIds[0] === 'object') {
          shifts = templateIds;
        } 
        // Si es array de strings (IDs antiguos), convertir a formato legacy
        else if (Array.isArray(templateIds)) {
          shifts = templateIds;
        }
      } catch {
        shifts = [];
      }

      let dateValue = row.date;
      if (row.date instanceof Date) {
        const year = row.date.getFullYear();
        const month = String(row.date.getMonth() + 1).padStart(2, '0');
        const day = String(row.date.getDate()).padStart(2, '0');
        dateValue = `${year}-${month}-${day}`;
      } else if (typeof row.date === 'string') {
        if (row.date.includes('GMT') || row.date.includes('(')) {
          const parsedDate = new Date(row.date);
          const year = parsedDate.getFullYear();
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const day = String(parsedDate.getDate()).padStart(2, '0');
          dateValue = `${year}-${month}-${day}`;
        } else {
          dateValue = row.date.split('T')[0];
        }
      }

      return {
        id: row.id,
        restaurantId: row.restaurant_id,
        date: dateValue,
        isOpen: Boolean(row.is_open),
        shifts,
        maxGuestsOverride: row.max_guests_override,
        notes: row.notes,
        specialDayMessage: row.special_day_message || null,
        specialMessageEnabled: Boolean(row.special_message_enabled),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    });

    console.log('✅ [LIST DAY EXCEPTIONS] Excepciones listadas:', exceptions.length);
    return exceptions;
  });
