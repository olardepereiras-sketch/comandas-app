import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const expandSlotCapacityProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      date: z.string(),
      hour: z.number(),
      minute: z.number(),
      newMaxGuests: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [EXPAND SLOT CAPACITY] Expandiendo capacidad de turno:', input);

    try {
      const dateString = input.date.includes('T') ? input.date.split('T')[0] : input.date;
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const dayOfWeek = localDate.getDay();
      const slotTimeMinutes = input.hour * 60 + input.minute;

      const updateShifts = (shifts: any[]): any[] => {
        return shifts.map((shift: any) => {
          const [startHour, startMinute] = shift.startTime.split(':').map(Number);
          const [endHour, endMinute] = shift.endTime.split(':').map(Number);
          const shiftStart = startHour * 60 + startMinute;
          const shiftEnd = endHour * 60 + endMinute;

          const matchesSingle = shiftStart === slotTimeMinutes && shiftEnd === slotTimeMinutes;
          const matchesRange = slotTimeMinutes >= shiftStart && slotTimeMinutes <= shiftEnd;

          if (matchesSingle || matchesRange) {
            console.log(`🔄 [EXPAND SLOT CAPACITY] Turno ${shift.startTime} → maxGuestsPerHour: ${shift.maxGuestsPerHour} → ${input.newMaxGuests}`);
            return { ...shift, maxGuestsPerHour: input.newMaxGuests };
          }
          return shift;
        });
      };

      const exceptionResult = await ctx.db.query(
        'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
        [input.restaurantId, dateString]
      );

      if (exceptionResult.rows.length > 0) {
        const exception = exceptionResult.rows[0];
        let shifts = typeof exception.template_ids === 'string'
          ? JSON.parse(exception.template_ids)
          : (exception.template_ids || []);

        if (!Array.isArray(shifts)) shifts = [];

        const updatedShifts = updateShifts(shifts);

        await ctx.db.query(
          'UPDATE day_exceptions SET template_ids = $1, updated_at = NOW() WHERE restaurant_id = $2 AND date = $3',
          [JSON.stringify(updatedShifts), input.restaurantId, dateString]
        );
      } else {
        const scheduleResult = await ctx.db.query(
          'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
          [input.restaurantId, dayOfWeek]
        );

        let shifts: any[] = [];
        let isOpen = true;

        if (scheduleResult.rows.length > 0) {
          const schedule = scheduleResult.rows[0];
          isOpen = schedule.is_open;
          shifts = JSON.parse(schedule.shifts || '[]');
        }

        const updatedShifts = updateShifts(shifts);

        const exceptionId = `exc-${Date.now()}`;
        await ctx.db.query(
          `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [exceptionId, input.restaurantId, dateString, isOpen, JSON.stringify(updatedShifts)]
        );
      }

      console.log('✅ [EXPAND SLOT CAPACITY] Capacidad expandida a:', input.newMaxGuests);
      return { success: true, newMaxGuests: input.newMaxGuests };
    } catch (error: any) {
      console.error('❌ [EXPAND SLOT CAPACITY] Error:', error);
      throw new Error(`Error al expandir capacidad del turno: ${error.message}`);
    }
  });
