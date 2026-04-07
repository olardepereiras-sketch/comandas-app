import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listRestaurantRatingsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      phone: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
      onlyBlocked: z.boolean().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST RESTAURANT RATINGS] Listando valoraciones del restaurante:', input.restaurantId);

    let query = `
      SELECT 
        cr.id,
        cr.client_id,
        cr.reservation_id,
        cr.rating_average,
        cr.ratings,
        cr.was_no_show,
        cr.auto_rated,
        cr.is_unwanted_client,
        cr.created_at,
        c.name as client_name,
        c.phone as client_phone,
        c.rating as client_global_rating,
        c.restaurant_blocks,
        r.date as reservation_date,
        r.time as reservation_time,
        r.guests
      FROM client_ratings cr
      INNER JOIN reservations r ON cr.reservation_id = r.id
      INNER JOIN clients c ON cr.client_id = c.id
      WHERE cr.restaurant_id = $1
    `;

    const params: any[] = [input.restaurantId];
    let paramIndex = 2;

    if (input.phone && input.phone.trim()) {
      query += ` AND c.phone LIKE ${paramIndex}`;
      params.push(`%${input.phone.trim()}%`);
      paramIndex++;
    }

    if (input.onlyBlocked) {
      query += ` AND c.restaurant_blocks::jsonb ? ${paramIndex}`;
      params.push(input.restaurantId);
      paramIndex++;
    }

    query += ` ORDER BY cr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(input.limit, input.offset);

    console.log('🔍 [LIST RESTAURANT RATINGS] Query:', query);
    console.log('🔍 [LIST RESTAURANT RATINGS] Params:', params);

    const result = await ctx.db.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM client_ratings cr
      INNER JOIN clients c ON cr.client_id = c.id
      WHERE cr.restaurant_id = $1
      ${input.phone && input.phone.trim() ? `AND c.phone LIKE $2` : ''}
      ${input.onlyBlocked ? `AND c.restaurant_blocks::jsonb ? '${input.restaurantId}'` : ''}
    `;
    const countParams: any[] = [input.restaurantId];
    if (input.phone && input.phone.trim()) {
      countParams.push(`%${input.phone.trim()}%`);
    }

    const countResult = await ctx.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    const ratings = result.rows.map((row: any) => {
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

      const restaurantBlocks = row.restaurant_blocks;
      const blocksData = typeof restaurantBlocks === 'string'
        ? JSON.parse(restaurantBlocks)
        : (restaurantBlocks || {});
      
      const blockInfo = blocksData[input.restaurantId];
      const isCurrentlyUnwanted = blockInfo && blockInfo.isBlocked && blockInfo.reason === 'unwanted';

      return {
        id: row.id,
        clientId: row.client_id,
        reservationId: row.reservation_id,
        clientName: row.client_name,
        clientPhone: row.client_phone,
        clientGlobalRating: row.client_global_rating != null ? Number(row.client_global_rating) : null,
        ratingAverage: parseFloat(row.rating_average),
        ratings: parsedRatings,
        wasNoShow: Boolean(row.was_no_show),
        autoRated: Boolean(row.auto_rated),
        isUnwantedClient: Boolean(row.is_unwanted_client),
        isCurrentlyUnwanted,
        reservationDate: dateValue,
        reservationTime: typeof row.reservation_time === 'string' ? JSON.parse(row.reservation_time) : row.reservation_time,
        guests: row.guests,
        createdAt: row.created_at,
      };
    });

    console.log(`✅ [LIST RESTAURANT RATINGS] Encontradas ${ratings.length} valoraciones (total: ${total})`);
    return { ratings, total };
  });
