import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export type RestaurantSchedule = {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  isOpen: boolean;
  shifts: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    maxGuestsPerHour: number;
    minRating: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export const listSchedulesProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST SCHEDULES] Listando horarios:', input.restaurantId);

    const result = await ctx.db.query(
      'SELECT * FROM schedules WHERE restaurant_id = $1 ORDER BY day_of_week',
      [input.restaurantId]
    );

    const schedules: RestaurantSchedule[] = result.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      dayOfWeek: row.day_of_week,
      isOpen: Boolean(row.is_open),
      shifts: JSON.parse(row.shifts || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    console.log('✅ [LIST SCHEDULES] Horarios listados:', schedules.length);

    return schedules;
  });
