import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listClientsProcedure = publicProcedure
  .input(
    z.object({
      searchQuery: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST CLIENTS] Listando clientes:', input);

    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT CASE WHEN ns.is_active = true THEN ns.id END) as total_no_shows
      FROM clients c
      LEFT JOIN client_no_shows ns ON c.id = ns.client_id
    `;
    const values: any[] = [];

    if (input.searchQuery) {
      query += ' WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1';
      values.push(`%${input.searchQuery}%`);
    }

    query += ' GROUP BY c.id ORDER BY c.created_at DESC';

    console.log('🔍 [LIST CLIENTS] Query:', query);
    console.log('🔍 [LIST CLIENTS] Values:', values);

    const result = await ctx.db.query(query, values);
    console.log('🔍 [LIST CLIENTS] Rows encontradas:', result.rows.length);

    const clients = await Promise.all(result.rows.map(async (row: any) => {
      const totalRatings = parseInt(row.total_ratings) || 0;
      const hasBeenRated = totalRatings > 0;
      
      // Calcular rating promedio de todas las reservas valoradas de este cliente
      let averageRating = 0;
      let ratingDetails = {
        punctuality: 0,
        behavior: 0,
        kindness: 0,
        education: 0,
        tip: 0,
      };
      
      if (hasBeenRated) {
        try {
          const ratingsResult = await ctx.db.query(
            `SELECT client_ratings 
             FROM reservations 
             WHERE client_id = $1 AND client_rated = true AND client_ratings IS NOT NULL`,
            [row.id]
          );
          
          if (ratingsResult.rows.length > 0) {
            let punctualitySum = 0;
            let behaviorSum = 0;
            let kindnessSum = 0;
            let educationSum = 0;
            let tipSum = 0;
            let count = 0;
            
            ratingsResult.rows.forEach((r: any) => {
              const ratings = typeof r.client_ratings === 'string' 
                ? JSON.parse(r.client_ratings) 
                : r.client_ratings;
              
              if (ratings['criteria-punctuality']) {
                punctualitySum += parseFloat(ratings['criteria-punctuality']);
              }
              if (ratings['criteria-behavior']) {
                behaviorSum += parseFloat(ratings['criteria-behavior']);
              }
              if (ratings['criteria-kindness']) {
                kindnessSum += parseFloat(ratings['criteria-kindness']);
              }
              if (ratings['criteria-education']) {
                educationSum += parseFloat(ratings['criteria-education']);
              }
              if (ratings['criteria-tip']) {
                tipSum += parseFloat(ratings['criteria-tip']);
              }
              count++;
            });
            
            if (count > 0) {
              ratingDetails.punctuality = punctualitySum / count;
              ratingDetails.behavior = behaviorSum / count;
              ratingDetails.kindness = kindnessSum / count;
              ratingDetails.education = educationSum / count;
              ratingDetails.tip = tipSum / count;
              averageRating = (ratingDetails.punctuality + ratingDetails.behavior + ratingDetails.kindness + ratingDetails.education + ratingDetails.tip) / 5;
            }
          }
        } catch (error) {
          console.error('Error calculando ratings para cliente:', row.id, error);
        }
      }
      
      const client = {
        id: row.id || '',
        name: row.name || 'Cliente',
        email: row.email || 'sin-email@example.com',
        phone: row.phone || '',
        rating: averageRating,
        totalRatings: totalRatings,
        ratingDetails: ratingDetails,
        noShowCount: parseInt(row.total_no_shows) || 0,
        isBlocked: Boolean(row.is_blocked),
        blockedUntil: row.blocked_until ? new Date(row.blocked_until).toISOString() : undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
      console.log('🔍 [LIST CLIENTS] Cliente mapeado:', { id: client.id, name: client.name, phone: client.phone, email: client.email, rating: client.rating, totalRatings: client.totalRatings });
      return client;
    }));

    console.log('✅ [LIST CLIENTS] Clientes listados:', clients.length);
    return clients;
  });
