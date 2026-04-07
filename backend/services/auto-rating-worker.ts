import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
});

let autoRatingInterval: ReturnType<typeof setInterval> | null = null;
let isAutoRatingRunning = false;

export async function autoRateExpiredReservations() {
  if (isAutoRatingRunning) {
    return 0;
  }

  isAutoRatingRunning = true;
  const dbClient = await pool.connect();
  
  try {
    console.log('🔍 [AUTO-RATING] Buscando reservas en estado ratable sin valorar que pasaron 24h...');
    
    const expiredReservations = await dbClient.query(`
      SELECT r.id, r.restaurant_id, r.client_id, r.rating_deadline
      FROM reservations r
      WHERE r.status = 'ratable'
        AND r.client_rated = false
        AND r.rating_deadline IS NOT NULL
        AND r.rating_deadline < NOW()
      LIMIT 100
    `);

    console.log(`✅ [AUTO-RATING] Encontradas ${expiredReservations.rows.length} reservas para auto-valorar`);

    const criteriaResult = await dbClient.query(`
      SELECT id, default_value 
      FROM rating_criteria 
      WHERE is_active = true 
      ORDER BY order_num
    `);

    const defaultRatings: any = {};
    criteriaResult.rows.forEach(criteria => {
      defaultRatings[criteria.id] = criteria.default_value || 4;
    });

    for (const reservation of expiredReservations.rows) {
      try {
        await dbClient.query('BEGIN');

        const ratingId = `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const ratingAverage = 4.0;

        await dbClient.query(`
          INSERT INTO client_ratings (
            id, restaurant_id, client_id, reservation_id,
            rating_average, ratings, was_no_show, auto_rated, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          ratingId,
          reservation.restaurant_id,
          reservation.client_id,
          reservation.id,
          ratingAverage,
          JSON.stringify(defaultRatings),
          false,
          true
        ]);

        const clientResult = await dbClient.query(
          `SELECT rating, total_ratings FROM clients WHERE id = $1`,
          [reservation.client_id]
        );

        if (clientResult.rows.length > 0) {
          const clientData = clientResult.rows[0];
          const currentRating = parseFloat(clientData.rating) || 0;
          const totalRatings = parseInt(clientData.total_ratings) || 0;
          const newTotalRatings = totalRatings + 1;
          const newGlobalRating = Number((((currentRating * totalRatings) + ratingAverage) / newTotalRatings).toFixed(1));

          await dbClient.query(
            `UPDATE clients 
             SET rating = $1, total_ratings = $2, updated_at = NOW()
             WHERE id = $3`,
            [newGlobalRating, newTotalRatings, reservation.client_id]
          );

          const localRatingsResult = await dbClient.query(
            `SELECT local_ratings FROM clients WHERE id = $1`,
            [reservation.client_id]
          );

          let localRatings: Record<string, { sum: number; count: number; average?: number }> = {};
          if (localRatingsResult.rows.length > 0) {
            const localRatingsData = localRatingsResult.rows[0].local_ratings;
            const parsedLocalRatings = typeof localRatingsData === 'string'
              ? JSON.parse(localRatingsData)
              : (localRatingsData || {});
            localRatings = parsedLocalRatings as Record<string, { sum: number; count: number; average?: number }>;
          }

          const restaurantRatings = localRatings[reservation.restaurant_id as string] ?? { sum: 0, count: 0 };
          const newSum = (restaurantRatings.sum || 0) + ratingAverage;
          const newCount = (restaurantRatings.count || 0) + 1;
          const newLocalAverage = Number((newSum / newCount).toFixed(1));

          localRatings[reservation.restaurant_id as string] = {
            sum: newSum,
            count: newCount,
            average: newLocalAverage,
          };

          await dbClient.query(
            `UPDATE clients 
             SET local_ratings = $1
             WHERE id = $2`,
            [JSON.stringify(localRatings), reservation.client_id]
          );
        }

        await dbClient.query(
          `UPDATE reservations 
           SET status = 'completed',
               client_rated = true, 
               client_ratings = $1,
               rating_deadline = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(defaultRatings), reservation.id]
        );

        await dbClient.query('COMMIT');
        console.log(`✅ [AUTO-RATING] Reserva ${reservation.id}: ratable → completed con rating automático 4.0`);

      } catch (error) {
        await dbClient.query('ROLLBACK');
        console.error(`❌ [AUTO-RATING] Error auto-valorando reserva ${reservation.id}:`, error);
      }
    }

    return expiredReservations.rows.length;
  } catch (error) {
    console.error('❌ [AUTO-RATING] Error en worker:', error);
    throw error;
  } finally {
    dbClient.release();
    isAutoRatingRunning = false;
  }
}

export function startAutoRatingWorker() {
  if (autoRatingInterval) {
    return;
  }

  console.log('🚀 [AUTO-RATING] Worker iniciado');

  void autoRateExpiredReservations().catch((error) => {
    console.error('❌ [AUTO-RATING] Error en ejecución inicial:', error);
  });
  
  autoRatingInterval = setInterval(async () => {
    try {
      const count = await autoRateExpiredReservations();
      if (count > 0) {
        console.log(`✅ [AUTO-RATING] Procesadas ${count} reservas en este ciclo`);
      }
    } catch (error) {
      console.error('❌ [AUTO-RATING] Error en ciclo del worker:', error);
    }
  }, 180000);
}
