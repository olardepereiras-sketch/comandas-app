import { z } from 'zod';
import { publicProcedure } from '../../../procedures';
import { db } from '../../../../db/client';

export const listForManagementRoute = publicProcedure
  .input(
    z.object({
      locationId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const result = await db.query(
      `SELECT * FROM tables 
       WHERE location_id = $1
       ORDER BY name ASC`,
      [input.locationId]
    );

    return result.rows;
  });
