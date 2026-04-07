import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listClientRatingsProcedure = publicProcedure
  .input(
    z.object({
      clientId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST CLIENT RATINGS] Listando valoraciones:', input);

    const ratingsResult = await ctx.db.query(
      `SELECT 
        cr.id,
        cr.rating_average,
        cr.ratings,
        cr.was_no_show,
        cr.auto_rated,
        cr.created_at,
        r.id as reservation_id,
        r.confirmation_token,
        r.date as reservation_date,
        r.time as reservation_time,
        r.guests,
        rest.name as restaurant_name,
        rest.id as restaurant_id
      FROM client_ratings cr
      INNER JOIN reservations r ON cr.reservation_id = r.id
      INNER JOIN restaurants rest ON cr.restaurant_id = rest.id
      WHERE cr.client_id = $1
      ORDER BY cr.created_at DESC`,
      [input.clientId]
    );

    const ratings = ratingsResult.rows.map(row => ({
      id: row.id,
      reservationId: row.reservation_id,
      confirmationToken: row.confirmation_token,
      reservationDate: row.reservation_date,
      reservationTime: row.reservation_time,
      guests: row.guests,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      ratingAverage: parseFloat(row.rating_average),
      ratings: typeof row.ratings === 'string' ? JSON.parse(row.ratings) : row.ratings,
      wasNoShow: row.was_no_show,
      autoRated: row.auto_rated,
      createdAt: row.created_at,
    }));

    console.log(`✅ [LIST CLIENT RATINGS] Encontradas ${ratings.length} valoraciones`);
    return ratings;
  });
