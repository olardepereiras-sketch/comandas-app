import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateClientRatingProcedure = publicProcedure
  .input(
    z.object({
      clientId: z.string(),
      reservationId: z.string(),
      rating: z.number().min(0).max(5),
      punctuality: z.number().min(0).max(5),
      behavior: z.number().min(0).max(5),
      kindness: z.number().min(0).max(5),
      education: z.number().min(0).max(5),
      tip: z.number().min(0).max(5),
      isNoShow: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE CLIENT RATING] Actualizando valoración:', input);

    const clientResult = await ctx.db.query(
      `SELECT rating, total_ratings, rating_punctuality, rating_behavior, 
              rating_kindness, rating_education, rating_tip, total_no_shows 
       FROM clients WHERE id = $1`,
      [input.clientId]
    );

    if (clientResult.rows.length === 0) {
      throw new Error('Cliente no encontrado');
    }

    const client = clientResult.rows[0];
    const currentRating = parseFloat(client.rating) || 0;
    const totalRatings = client.total_ratings || 0;
    
    const currentPunctuality = parseFloat(client.rating_punctuality) || 0;
    const currentBehavior = parseFloat(client.rating_behavior) || 0;
    const currentKindness = parseFloat(client.rating_kindness) || 0;
    const currentEducation = parseFloat(client.rating_education) || 0;
    const currentTip = parseFloat(client.rating_tip) || 0;
    const currentNoShows = parseInt(client.total_no_shows) || 0;

    const newTotalRatings = totalRatings + 1;
    const newRating = Number((((currentRating * totalRatings) + input.rating) / newTotalRatings).toFixed(1));

    const newPunctuality = Number((((currentPunctuality * totalRatings) + input.punctuality) / newTotalRatings).toFixed(1));
    const newBehavior = Number((((currentBehavior * totalRatings) + input.behavior) / newTotalRatings).toFixed(1));
    const newKindness = Number((((currentKindness * totalRatings) + input.kindness) / newTotalRatings).toFixed(1));
    const newEducation = Number((((currentEducation * totalRatings) + input.education) / newTotalRatings).toFixed(1));
    const newTip = Number((((currentTip * totalRatings) + input.tip) / newTotalRatings).toFixed(1));
    const newNoShows = input.isNoShow ? currentNoShows + 1 : currentNoShows;

    await ctx.db.query(
      `UPDATE clients 
       SET rating = $1, total_ratings = $2, 
           rating_punctuality = $3, rating_behavior = $4, 
           rating_kindness = $5, rating_education = $6, 
           rating_tip = $7, total_no_shows = $8,
           updated_at = $9
       WHERE id = $10`,
      [
        newRating,
        newTotalRatings,
        newPunctuality,
        newBehavior,
        newKindness,
        newEducation,
        newTip,
        newNoShows,
        new Date(),
        input.clientId,
      ]
    );

    await ctx.db.query(
      `UPDATE reservations 
       SET client_rated = true, updated_at = $1
       WHERE id = $2`,
      [new Date(), input.reservationId]
    );

    console.log('✅ [UPDATE CLIENT RATING] Valoración actualizada');

    return {
      newRating,
      newTotalRatings,
      newRatingDetails: {
        punctuality: newPunctuality,
        behavior: newBehavior,
        kindness: newKindness,
        education: newEducation,
        tip: newTip,
      },
      newNoShows,
    };
  });
