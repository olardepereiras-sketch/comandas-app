import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getClientDetailsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      clientId: z.string().optional(),
      phone: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [GET CLIENT DETAILS] Obteniendo detalles del cliente:', input);

    try {
      let query = `
        SELECT 
          id, 
          name, 
          email, 
          phone, 
          rating as global_rating,
          total_ratings,
          total_no_shows,
          local_ratings,
          restaurant_blocks,
          created_at
        FROM clients 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (input.clientId) {
        query += ` AND id = $${paramIndex}`;
        params.push(input.clientId);
        paramIndex++;
      } else if (input.phone) {
        query += ` AND phone = $${paramIndex}`;
        params.push(input.phone);
        paramIndex++;
      } else {
        throw new Error('Debe proporcionar clientId o phone');
      }

      const result = await ctx.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const client = result.rows[0];

      const localRatings = client.local_ratings;
      const localRatingsData = typeof localRatings === 'string'
        ? JSON.parse(localRatings)
        : (localRatings || {});
      
      const restaurantLocalData = localRatingsData[input.restaurantId];
      const localRating = restaurantLocalData?.average || null;
      const localRatingCount = restaurantLocalData?.count || 0;

      const restaurantBlocks = client.restaurant_blocks;
      const blocksData = typeof restaurantBlocks === 'string'
        ? JSON.parse(restaurantBlocks)
        : (restaurantBlocks || {});
      
      const blockInfo = blocksData[input.restaurantId];
      const isUnwantedClient = blockInfo && blockInfo.isBlocked && blockInfo.reason === 'unwanted';
      const blockedAt = blockInfo?.blockedAt || null;

      const ratingsQuery = `
        SELECT 
          cr.id,
          cr.rating_average,
          cr.ratings,
          cr.was_no_show,
          cr.auto_rated,
          cr.is_unwanted_client,
          cr.created_at,
          r.date as reservation_date,
          r.time as reservation_time
        FROM client_ratings cr
        INNER JOIN reservations r ON cr.reservation_id = r.id
        WHERE cr.client_id = $1 AND cr.restaurant_id = $2
        ORDER BY cr.created_at DESC
        LIMIT 20
      `;

      const ratingsResult = await ctx.db.query(ratingsQuery, [client.id, input.restaurantId]);

      const ratings = ratingsResult.rows.map((row: any) => {
        let parsedRatings = null;
        if (row.ratings) {
          try {
            parsedRatings = typeof row.ratings === 'string' ? JSON.parse(row.ratings) : row.ratings;
          } catch (e) {
            console.error('Error parsing ratings:', e);
          }
        }

        let dateValue = row.reservation_date;
        if (row.reservation_date instanceof Date) {
          const year = row.reservation_date.getFullYear();
          const month = String(row.reservation_date.getMonth() + 1).padStart(2, '0');
          const day = String(row.reservation_date.getDate()).padStart(2, '0');
          dateValue = `${year}-${month}-${day}`;
        } else if (typeof row.reservation_date === 'string' && row.reservation_date.includes('T')) {
          dateValue = row.reservation_date.split('T')[0];
        }

        return {
          id: row.id,
          ratingAverage: parseFloat(row.rating_average),
          ratings: parsedRatings,
          wasNoShow: Boolean(row.was_no_show),
          autoRated: Boolean(row.auto_rated),
          isUnwantedClient: Boolean(row.is_unwanted_client),
          reservationDate: dateValue,
          reservationTime: typeof row.reservation_time === 'string' ? JSON.parse(row.reservation_time) : row.reservation_time,
          createdAt: row.created_at,
        };
      });

      console.log('✅ [GET CLIENT DETAILS] Cliente encontrado');

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        globalRating: client.global_rating != null ? parseFloat(client.global_rating) : 5.0,
        totalRatings: parseInt(client.total_ratings) || 0,
        totalNoShows: parseInt(client.total_no_shows) || 0,
        localRating: localRating != null ? parseFloat(localRating) : null,
        localRatingCount,
        isUnwantedClient,
        blockedAt,
        ratings,
        createdAt: client.created_at,
      };
    } catch (error: any) {
      console.error('❌ [GET CLIENT DETAILS] Error:', error);
      throw new Error(`Error al obtener detalles del cliente: ${error.message}`);
    }
  });
