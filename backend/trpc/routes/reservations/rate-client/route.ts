import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const rateClientProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      reservationId: z.string(),
      clientId: z.string(),
      ratings: z.array(
        z.object({
          criteriaId: z.string(),
          value: z.number().min(0).max(5),
        })
      ),
      isNoShow: z.boolean().optional(),
      isUnwantedClient: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [RATE CLIENT] Valorando cliente:', input);

    try {
      const reservationResult = await ctx.db.query(
        `SELECT rating_deadline FROM reservations WHERE id = $1`,
        [input.reservationId]
      );

      if (reservationResult.rows.length > 0 && reservationResult.rows[0].rating_deadline) {
        const deadline = new Date(reservationResult.rows[0].rating_deadline);
        if (new Date() > deadline) {
          throw new Error('El período de valoración ha expirado (24 horas)');
        }
      }

      const clientResult = await ctx.db.query(
        `SELECT id, 
                COALESCE(rating, 0.0) as rating, 
                COALESCE(total_ratings, 0) as total_ratings, 
                COALESCE(total_no_shows, 0) as total_no_shows,
                local_ratings,
                restaurant_blocks 
         FROM clients WHERE id = $1`,
        [input.clientId]
      );

      if (clientResult.rows.length === 0) {
        console.error('❌ [RATE CLIENT] Cliente no encontrado:', input.clientId);
        throw new Error('Cliente no encontrado');
      }

      const client = clientResult.rows[0];
      const totalRatings = parseInt(client.total_ratings) || 0;
      const newTotalRatings = totalRatings + 1;

      console.log('📊 [RATE CLIENT] Cliente actual:', {
        rating: client.rating,
        totalRatings,
        newTotalRatings,
      });

      let totalRatingSum = 0;
      let criteriaCount = 0;

      input.ratings.forEach(rating => {
        if (rating.value > 0) {
          totalRatingSum += rating.value;
          criteriaCount++;
        }
      });

      console.log('📊 [RATE CLIENT] Suma total de ratings:', totalRatingSum, 'Criterios contados:', criteriaCount);

      const currentGlobalRating = parseFloat(client.rating) || 0;
      let averageRating = criteriaCount > 0 ? totalRatingSum / criteriaCount : 4.0;
      
      if (input.isNoShow) {
        averageRating = 0;
        console.log('⚠️ [RATE CLIENT] No-show detectado, valoración = 0');
      }
      
      const newGlobalRating = Number((((currentGlobalRating * totalRatings) + averageRating) / newTotalRatings).toFixed(1));

      console.log('⭐ [RATE CLIENT] Nueva valoración global:', newGlobalRating);

      let localRatings = {};
      if (client.local_ratings) {
        localRatings = typeof client.local_ratings === 'string' 
          ? JSON.parse(client.local_ratings) 
          : client.local_ratings;
      }

      const restaurantRatings = localRatings[input.restaurantId as keyof typeof localRatings] || { sum: 0, count: 0 };
      const newSum = (restaurantRatings.sum || 0) + averageRating;
      const newCount = (restaurantRatings.count || 0) + 1;
      const newLocalAverage = Number((newSum / newCount).toFixed(1));

      localRatings[input.restaurantId as keyof typeof localRatings] = {
        sum: newSum,
        count: newCount,
        average: newLocalAverage
      };

      console.log('⭐ [RATE CLIENT] Nueva valoración local para restaurante:', {
        restaurantId: input.restaurantId,
        localAverage: newLocalAverage,
        count: newCount
      });

      const currentNoShows = parseInt(client.total_no_shows) || 0;
      const newNoShows = input.isNoShow ? currentNoShows + 1 : currentNoShows;

      let restaurantBlocks = {};
      if (client.restaurant_blocks) {
        restaurantBlocks = typeof client.restaurant_blocks === 'string' 
          ? JSON.parse(client.restaurant_blocks) 
          : client.restaurant_blocks;
      }

      if (input.isUnwantedClient) {
        restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks] = {
          isBlocked: true,
          reason: 'unwanted',
          blockedAt: new Date().toISOString(),
          blockedBy: 'restaurant'
        };
        console.log('🚫 [RATE CLIENT] Cliente marcado como no deseado para restaurante:', input.restaurantId);
      } else if (restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks]) {
        delete restaurantBlocks[input.restaurantId as keyof typeof restaurantBlocks];
        console.log('✅ [RATE CLIENT] Cliente desbloqueado para restaurante:', input.restaurantId);
      }

      await ctx.db.query(
        `UPDATE clients 
         SET rating = $1, 
             total_ratings = $2, 
             total_no_shows = $3,
             local_ratings = $4,
             restaurant_blocks = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          newGlobalRating,
          newTotalRatings,
          newNoShows,
          JSON.stringify(localRatings),
          JSON.stringify(restaurantBlocks),
          input.clientId,
        ]
      );
      
      console.log('📊 [RATE CLIENT] Cliente actualizado:', {
        rating: newGlobalRating,
        totalRatings: newTotalRatings,
        averageRating: averageRating,
        isNoShow: input.isNoShow
      });

      console.log('✅ [RATE CLIENT] Cliente actualizado en BD');

      const ratingsObject: any = {};
      input.ratings.forEach(rating => {
        ratingsObject[rating.criteriaId] = rating.value;
      });

      const ratingId = `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await ctx.db.query(
        `INSERT INTO client_ratings (
          id, restaurant_id, client_id, reservation_id,
          rating_average, ratings, was_no_show, auto_rated, is_unwanted_client
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          ratingId,
          input.restaurantId,
          input.clientId,
          input.reservationId,
          averageRating,
          JSON.stringify(ratingsObject),
          input.isNoShow || false,
          false,
          input.isUnwantedClient || false
        ]
      );

      await ctx.db.query(
        `UPDATE reservations 
         SET client_rated = true, 
             client_ratings = $1, 
             was_no_show = $2,
             status = 'completed',
             rating_deadline = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(ratingsObject), input.isNoShow || false, input.reservationId]
      );

      console.log('✅ [RATE CLIENT] Reserva marcada como completed');

      console.log('✅ [RATE CLIENT] Reserva actualizada en BD');
      console.log('✅ [RATE CLIENT] Cliente valorado correctamente');

      return {
        success: true,
        newGlobalRating: newGlobalRating,
        newLocalRating: newLocalAverage,
        newTotalRatings,
        message: 'Cliente valorado correctamente',
      };
    } catch (error: any) {
      console.error('❌ [RATE CLIENT] Error completo:', error);
      console.error('❌ [RATE CLIENT] Stack:', error.stack);
      throw new Error(`Error al valorar cliente: ${error.message}`);
    }
  });
