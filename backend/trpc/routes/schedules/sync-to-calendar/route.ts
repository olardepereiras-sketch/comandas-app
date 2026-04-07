import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const syncSchedulesToCalendarProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      daysAhead: z.number().optional().default(90),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SYNC SCHEDULES TO CALENDAR] Iniciando sincronización:', input);

    const schedulesResult = await ctx.db.query(
      'SELECT * FROM schedules WHERE restaurant_id = $1',
      [input.restaurantId]
    );

    const schedules = schedulesResult.rows.map((row: any) => ({
      dayOfWeek: row.day_of_week as number,
      isOpen: Boolean(row.is_open),
      shifts: JSON.parse(row.shifts || '[]') as any[],
    }));

    console.log(`📋 [SYNC] Horarios semanales encontrados: ${schedules.length}`);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let updatedCount = 0;
    let skippedCount = 0;
    const daysAhead = input.daysAhead ?? 90;

    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayOfWeek = date.getDay();
      const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

      if (!schedule || !schedule.isOpen || schedule.shifts.length === 0) {
        skippedCount++;
        continue;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // Store individual shift entries as-is to preserve per-slot data
      // (maxGuestsPerHour, minRating, minLocalRating per time slot).
      // The planning page handles grouping by templateId internally.
      const shiftsData = JSON.stringify(schedule.shifts);
      const nowTs = new Date();

      const existingResult = await ctx.db.query(
        'SELECT id FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
        [input.restaurantId, dateString]
      );

      if (existingResult.rows.length > 0) {
        await ctx.db.query(
          `UPDATE day_exceptions 
           SET is_open = true, template_ids = $1, updated_at = $2
           WHERE restaurant_id = $3 AND date = $4`,
          [shiftsData, nowTs, input.restaurantId, dateString]
        );
        console.log(`✅ [SYNC] Actualizado día ${dateString}`);
      } else {
        const id = `day-exc-${input.restaurantId.substring(0, 8)}-${dateString}`;
        try {
          await ctx.db.query(
            `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, input.restaurantId, dateString, true, shiftsData, nowTs, nowTs]
          );
          console.log(`✅ [SYNC] Creado día ${dateString}`);
        } catch (insertErr: any) {
          if (insertErr.code === '23505') {
            await ctx.db.query(
              `UPDATE day_exceptions 
               SET is_open = true, template_ids = $1, updated_at = $2
               WHERE restaurant_id = $3 AND date = $4`,
              [shiftsData, nowTs, input.restaurantId, dateString]
            );
            console.log(`✅ [SYNC] Actualizado día ${dateString} (conflicto resuelto)`);
          } else {
            throw insertErr;
          }
        }
      }

      updatedCount++;
    }

    console.log(`✅ [SYNC SCHEDULES TO CALENDAR] Completado: ${updatedCount} días actualizados, ${skippedCount} omitidos`);

    return { updatedCount, skippedCount };
  });
