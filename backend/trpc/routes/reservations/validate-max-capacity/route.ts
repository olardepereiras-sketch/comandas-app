import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const validateMaxCapacityProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      locationId: z.string(),
      date: z.string(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }),
      guests: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [VALIDATE MAX CAPACITY] Validando capacidad máxima:', input);

    try {
      const schedulesResult = await ctx.db.query(
        'SELECT * FROM schedules WHERE restaurant_id = $1',
        [input.restaurantId]
      );

      const inputDate = new Date(input.date);
      const dayOfWeek = inputDate.getDay();
      
      const schedule = schedulesResult.rows.find((s: any) => s.day_of_week === dayOfWeek);
      
      if (!schedule) {
        return {
          canAccommodate: true,
          currentCapacity: 0,
          maxCapacity: 999,
          requiredCapacity: input.guests,
        };
      }

      const shifts = JSON.parse(schedule.shifts || '[]');
      const timeString = `${String(input.time.hour).padStart(2, '0')}:${String(input.time.minute).padStart(2, '0')}`;
      
      const matchingShift = shifts.find((shift: any) => {
        const slotTime = input.time.hour * 60 + input.time.minute;
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        
        return slotTime >= startTime && slotTime < endTime;
      });

      if (!matchingShift || !matchingShift.maxGuestsPerHour) {
        return {
          canAccommodate: true,
          currentCapacity: 0,
          maxCapacity: 999,
          requiredCapacity: input.guests,
        };
      }

      const maxGuestsPerHour = matchingShift.maxGuestsPerHour;

      const reservationsResult = await ctx.db.query(
        `SELECT * FROM reservations 
         WHERE restaurant_id = $1 
         AND location_id = $2 
         AND date::date = $3::date
         AND status != 'cancelled'`,
        [input.restaurantId, input.locationId, input.date]
      );

      const slotTime = input.time.hour * 60 + input.time.minute;
      let currentCapacity = 0;

      reservationsResult.rows.forEach((reservation: any) => {
        const resTime = typeof reservation.time === 'string' 
          ? JSON.parse(reservation.time) 
          : reservation.time;
        const resTimeMinutes = resTime.hour * 60 + resTime.minute;
        
        if (Math.abs(slotTime - resTimeMinutes) < 60) {
          currentCapacity += reservation.guests || 0;
        }
      });

      const requiredCapacity = currentCapacity + input.guests;
      const canAccommodate = requiredCapacity <= maxGuestsPerHour;

      console.log(`✅ [VALIDATE MAX CAPACITY] Resultado: canAccommodate=${canAccommodate}, current=${currentCapacity}, max=${maxGuestsPerHour}, required=${requiredCapacity}`);

      return {
        canAccommodate,
        currentCapacity,
        maxCapacity: maxGuestsPerHour,
        requiredCapacity,
      };
    } catch (error) {
      console.error('❌ [VALIDATE MAX CAPACITY] Error:', error);
      return {
        canAccommodate: true,
        currentCapacity: 0,
        maxCapacity: 999,
        requiredCapacity: input.guests,
      };
    }
  });
