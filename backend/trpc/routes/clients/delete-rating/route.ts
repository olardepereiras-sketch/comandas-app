import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteClientRatingProcedure = publicProcedure
  .input(
    z.object({
      ratingId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE RATING] Eliminando valoración:', input);

    const ratingResult = await ctx.db.query(
      `SELECT restaurant_id, client_id, reservation_id, rating_average 
       FROM client_ratings WHERE id = $1`,
      [input.ratingId]
    );

    if (ratingResult.rows.length === 0) {
      throw new Error('Valoración no encontrada');
    }

    const ratingData = ratingResult.rows[0];

    await ctx.db.query(
      `DELETE FROM client_ratings WHERE id = $1`,
      [input.ratingId]
    );

    const remainingRatingsResult = await ctx.db.query(
      `SELECT rating_average FROM client_ratings WHERE client_id = $1`,
      [ratingData.client_id]
    );

    if (remainingRatingsResult.rows.length > 0) {
      let globalSum = 0;
      remainingRatingsResult.rows.forEach(row => {
        globalSum += parseFloat(row.rating_average);
      });

      const newGlobalRating = Number((globalSum / remainingRatingsResult.rows.length).toFixed(1));

      await ctx.db.query(
        `UPDATE clients 
         SET rating = $1, 
             total_ratings = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newGlobalRating, remainingRatingsResult.rows.length, ratingData.client_id]
      );
    } else {
      await ctx.db.query(
        `UPDATE clients 
         SET rating = 0, 
             total_ratings = 0,
             updated_at = NOW()
         WHERE id = $1`,
        [ratingData.client_id]
      );
    }

    const restaurantRatingsResult = await ctx.db.query(
      `SELECT rating_average FROM client_ratings 
       WHERE client_id = $1 AND restaurant_id = $2`,
      [ratingData.client_id, ratingData.restaurant_id]
    );

    const clientResult = await ctx.db.query(
      `SELECT local_ratings FROM clients WHERE id = $1`,
      [ratingData.client_id]
    );

    let localRatings = {};
    if (clientResult.rows.length > 0 && clientResult.rows[0].local_ratings) {
      localRatings = typeof clientResult.rows[0].local_ratings === 'string'
        ? JSON.parse(clientResult.rows[0].local_ratings)
        : clientResult.rows[0].local_ratings;
    }

    if (restaurantRatingsResult.rows.length > 0) {
      let restaurantSum = 0;
      restaurantRatingsResult.rows.forEach(row => {
        restaurantSum += parseFloat(row.rating_average);
      });

      const newLocalAverage = Number((restaurantSum / restaurantRatingsResult.rows.length).toFixed(1));

      localRatings[ratingData.restaurant_id as keyof typeof localRatings] = {
        sum: restaurantSum,
        count: restaurantRatingsResult.rows.length,
        average: newLocalAverage
      };
    } else {
      delete localRatings[ratingData.restaurant_id as keyof typeof localRatings];
    }

    await ctx.db.query(
      `UPDATE clients 
       SET local_ratings = $1
       WHERE id = $2`,
      [JSON.stringify(localRatings), ratingData.client_id]
    );

    await ctx.db.query(
      `UPDATE reservations 
       SET client_rated = false, 
           client_ratings = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [ratingData.reservation_id]
    );

    console.log('✅ [DELETE RATING] Valoración eliminada y ratings recalculados');

    return { success: true };
  });
