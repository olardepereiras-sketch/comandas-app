import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getClientNoShowsProcedure = publicProcedure
  .input(z.object({ clientId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🔵 [CLIENT NO SHOWS] Obteniendo no shows del cliente:', input.clientId);

    const result = await ctx.db.query(
      `SELECT 
        id, 
        client_id, 
        reservation_id, 
        reservation_token, 
        restaurant_name, 
        reservation_date, 
        reservation_time, 
        guest_count, 
        is_active, 
        created_at, 
        deactivated_at
       FROM client_no_shows
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [input.clientId]
    );

    const noShows = result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      reservationId: row.reservation_id,
      reservationToken: row.reservation_token,
      restaurantName: row.restaurant_name,
      reservationDate: row.reservation_date,
      reservationTime: row.reservation_time,
      guestCount: row.guest_count,
      isActive: row.is_active,
      createdAt: row.created_at,
      deactivatedAt: row.deactivated_at,
    }));

    console.log(`✅ [CLIENT NO SHOWS] ${noShows.length} no shows encontrados`);

    return noShows;
  });
