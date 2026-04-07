import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const restaurantDashboardStatsProcedure = publicProcedure
  .input(z.object({ restaurantId: z.string() }))
  .query(async ({ input, ctx }) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      console.log('🔵 [RESTAURANT DASHBOARD] Obteniendo estadísticas:', {
        restaurantId: input.restaurantId,
        startOfMonth: startOfMonth.toISOString(),
        startOfDay: startOfDay.toISOString(),
      });

      // Reservas del mes actual (solo reservas cuya fecha está en el mes actual)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthReservationsResult = await ctx.db.query(
        `SELECT COUNT(*) as count 
         FROM reservations 
         WHERE restaurant_id = $1 
           AND date >= $2 
           AND date < $3
           AND status NOT IN ('cancelled', 'modified')`,
        [input.restaurantId, startOfMonth.toISOString(), endOfMonth.toISOString()]
      );

      // Reservas para hoy (excluir anuladas)
      const todayReservationsResult = await ctx.db.query(
        `SELECT COUNT(*) as count 
         FROM reservations 
         WHERE restaurant_id = $1 
           AND date >= $2 
           AND date < $3
           AND status NOT IN ('cancelled', 'modified')`,
        [input.restaurantId, startOfDay.toISOString(), endOfDay.toISOString()]
      );

      // Valoración media de las últimas 500 valoraciones realizadas por este restaurante
      let avgRating = 0;
      try {
        const ratingResult = await ctx.db.query(
          `SELECT 
            r.client_ratings,
            r.created_at
          FROM reservations r
          WHERE r.restaurant_id = $1 
          AND r.client_rated = true
          AND r.client_ratings IS NOT NULL
          ORDER BY r.created_at DESC
          LIMIT 500`,
          [input.restaurantId]
        );
        
        if (ratingResult.rows.length > 0) {
          let totalSum = 0;
          let totalCount = 0;
          
          ratingResult.rows.forEach((row: any) => {
            const ratings = typeof row.client_ratings === 'string' 
              ? JSON.parse(row.client_ratings) 
              : row.client_ratings;
            
            let reservationSum = 0;
            let reservationCount = 0;
            
            Object.entries(ratings).forEach(([key, value]) => {
              if (key !== 'isNoShow' && typeof value === 'number' && value > 0) {
                reservationSum += value;
                reservationCount++;
              }
            });
            
            if (reservationCount > 0) {
              totalSum += (reservationSum / reservationCount);
              totalCount++;
            }
          });
          
          if (totalCount > 0) {
            avgRating = totalSum / totalCount;
          }
        }
        
        console.log('📊 [RESTAURANT DASHBOARD] Valoración media calculada de', ratingResult.rows.length, 'valoraciones:', avgRating);
      } catch (ratingError) {
        console.error('❌ [RESTAURANT DASHBOARD] Error calculando rating:', ratingError);
        avgRating = 0;
      }

      const monthCount = parseInt(monthReservationsResult.rows[0]?.count || '0');
      const todayCount = parseInt(todayReservationsResult.rows[0]?.count || '0');

      console.log('✅ [RESTAURANT DASHBOARD] Estadísticas obtenidas:', {
        reservationsThisMonth: monthCount,
        averageRating: Math.round(avgRating * 10) / 10,
        reservationsToday: todayCount,
      });

      return {
        reservationsThisMonth: monthCount,
        averageRating: Math.round(avgRating * 10) / 10,
        reservationsToday: todayCount,
      };
    } catch (error) {
      console.error('❌ [RESTAURANT DASHBOARD] Error completo:', error);
      // Devolver valores por defecto en caso de error
      return {
        reservationsThisMonth: 0,
        averageRating: 0,
        reservationsToday: 0,
      };
    }
  });
