import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateClientRatingDetailProcedure = publicProcedure
  .input(
    z.object({
      ratingId: z.string(),
      ratings: z.array(
        z.object({
          criteriaId: z.string(),
          value: z.number().min(0).max(5),
        })
      ),
      isNoShow: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE RATING DETAIL] Actualizando valoración:', input);

    const ratingResult = await ctx.db.query(
      `SELECT restaurant_id, client_id, reservation_id FROM client_ratings WHERE id = $1`,
      [input.ratingId]
    );

    if (ratingResult.rows.length === 0) {
      throw new Error('Valoración no encontrada');
    }

    const ratingData = ratingResult.rows[0];

    let totalRatingSum = 0;
    let criteriaCount = 0;

    input.ratings.forEach(rating => {
      if (rating.value > 0) {
        totalRatingSum += rating.value;
        criteriaCount++;
      }
    });

    const newAverageRating = criteriaCount > 0 ? totalRatingSum / criteriaCount : 4.0;

    const ratingsObject: any = {};
    input.ratings.forEach(rating => {
      ratingsObject[rating.criteriaId] = rating.value;
    });

    await ctx.db.query(
      `UPDATE client_ratings 
       SET rating_average = $1, 
           ratings = $2
       WHERE id = $3`,
      [newAverageRating, JSON.stringify(ratingsObject), input.ratingId]
    );

    const allRatingsResult = await ctx.db.query(
      `SELECT rating_average FROM client_ratings WHERE client_id = $1`,
      [ratingData.client_id]
    );

    let globalSum = 0;
    allRatingsResult.rows.forEach(row => {
      globalSum += parseFloat(row.rating_average);
    });

    const newGlobalRating = Number((globalSum / allRatingsResult.rows.length).toFixed(1));

    await ctx.db.query(
      `UPDATE clients 
       SET rating = $1, 
           total_ratings = $2
       WHERE id = $3`,
      [newGlobalRating, allRatingsResult.rows.length, ratingData.client_id]
    );

    const restaurantRatingsResult = await ctx.db.query(
      `SELECT rating_average FROM client_ratings 
       WHERE client_id = $1 AND restaurant_id = $2`,
      [ratingData.client_id, ratingData.restaurant_id]
    );

    let restaurantSum = 0;
    restaurantRatingsResult.rows.forEach(row => {
      restaurantSum += parseFloat(row.rating_average);
    });

    const newLocalAverage = Number((restaurantSum / restaurantRatingsResult.rows.length).toFixed(1));

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

    localRatings[ratingData.restaurant_id as keyof typeof localRatings] = {
      sum: restaurantSum,
      count: restaurantRatingsResult.rows.length,
      average: newLocalAverage
    };

    await ctx.db.query(
      `UPDATE clients 
       SET local_ratings = $1
       WHERE id = $2`,
      [JSON.stringify(localRatings), ratingData.client_id]
    );

    await ctx.db.query(
      `UPDATE reservations 
       SET client_ratings = $1, 
           was_no_show = $2
       WHERE id = $3`,
      [JSON.stringify(ratingsObject), input.isNoShow || false, ratingData.reservation_id]
    );

    if (input.isNoShow !== undefined) {
      const existingNoShow = await ctx.db.query(
        `SELECT id, is_active FROM client_no_shows 
         WHERE reservation_id = $1`,
        [ratingData.reservation_id]
      );

      if (input.isNoShow && existingNoShow.rows.length === 0) {
        const noShowId = `no-show-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await ctx.db.query(
          `INSERT INTO client_no_shows 
           (id, client_id, restaurant_id, reservation_id, is_active, created_at) 
           VALUES ($1, $2, $3, $4, true, NOW())`,
          [noShowId, ratingData.client_id, ratingData.restaurant_id, ratingData.reservation_id]
        );
        console.log('✅ [UPDATE RATING DETAIL] No show creado');
      } else if (!input.isNoShow && existingNoShow.rows.length > 0 && existingNoShow.rows[0].is_active) {
        await ctx.db.query(
          `UPDATE client_no_shows 
           SET is_active = false, deactivated_at = NOW() 
           WHERE id = $1`,
          [existingNoShow.rows[0].id]
        );
        
        const activeNoShowsCount = await ctx.db.query(
          `SELECT COUNT(*) as count FROM client_no_shows 
           WHERE client_id = $1 AND is_active = true`,
          [ratingData.client_id]
        );
        
        if (parseInt(activeNoShowsCount.rows[0].count) === 0) {
          await ctx.db.query(
            `UPDATE clients 
             SET is_blocked = false, blocked_until = NULL 
             WHERE id = $1`,
            [ratingData.client_id]
          );
        }
        console.log('✅ [UPDATE RATING DETAIL] No show desactivado');
      }
    }

    console.log('✅ [UPDATE RATING DETAIL] Valoración actualizada');

    return {
      success: true,
      newGlobalRating,
      newLocalRating: newLocalAverage,
    };
  });
