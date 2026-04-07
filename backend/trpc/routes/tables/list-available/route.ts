import { z } from 'zod';
import { publicProcedure } from '../../../procedures';
import { db } from '../../../../db/client';

export const listAvailableRoute = publicProcedure
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
      includeTemporary: z.boolean().optional().default(false),
    })
  )
  .query(async ({ input }) => {
    const permanentTables = await db.query(
      `SELECT * FROM tables 
       WHERE location_id = $1 AND capacity >= $2
       ORDER BY capacity ASC`,
      [input.locationId, input.guests]
    );

    let temporaryTables: any[] = [];
    
    if (input.includeTemporary) {
      const tempResult = await db.query(
        `SELECT tt.* FROM temporary_tables tt
         JOIN reservations r ON tt.reservation_id = r.id
         WHERE tt.location_id = $1 
         AND tt.type = 'split_a'
         AND tt.capacity >= $2
         AND r.date = $3
         AND r.status NOT IN ('cancelled', 'completed')`,
        [input.locationId, input.guests, input.date]
      );
      temporaryTables = tempResult.rows;
    }

    const allTables = [
      ...permanentTables.rows.map(t => ({ ...t, isTemporary: false })),
      ...temporaryTables.map(t => ({ ...t, isTemporary: true }))
    ];

    const occupiedTableIds = await db.query(
      `SELECT DISTINCT rt.table_id 
       FROM reservation_tables rt
       JOIN reservations r ON rt.reservation_id = r.id
       WHERE r.restaurant_id = $1
       AND r.location_id = $2
       AND r.date = $3
       AND r.status NOT IN ('cancelled', 'completed')`,
      [input.restaurantId, input.locationId, input.date]
    );

    const occupiedIds = new Set(occupiedTableIds.rows.map(r => r.table_id));

    const availableTables = allTables.filter(table => !occupiedIds.has(table.id));

    return availableTables;
  });
