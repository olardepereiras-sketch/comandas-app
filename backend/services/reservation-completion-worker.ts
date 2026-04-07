import pg from 'pg';

const { Pool } = pg;

let reservationCompletionInterval: ReturnType<typeof setInterval> | null = null;
let isReservationCompletionRunning = false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
});

export async function updateReservationStates() {
  if (isReservationCompletionRunning) {
    return 0;
  }

  isReservationCompletionRunning = true;
  const client = await pool.connect();
  
  try {
    console.log('🔍 [RESERVATION STATES] Actualizando estados de reservas...');
    
    const confirmedToInProgress = await client.query(`
      SELECT 
        r.id, 
        r.date, 
        r.time,
        (r.time::jsonb->>'hour')::int as time_hour,
        (r.time::jsonb->>'minute')::int as time_minute
      FROM reservations r
      WHERE r.status = 'confirmed'
        AND r.date::date <= CURRENT_DATE
        AND (
          r.date::date < CURRENT_DATE
          OR
          (r.date::date = CURRENT_DATE AND 
           (r.time::jsonb->>'hour')::int * 60 + (r.time::jsonb->>'minute')::int 
           <= EXTRACT(HOUR FROM CURRENT_TIMESTAMP) * 60 + EXTRACT(MINUTE FROM CURRENT_TIMESTAMP))
        )
      LIMIT 100
    `);

    console.log(`✅ [STATES] Encontradas ${confirmedToInProgress.rows.length} reservas confirmed → in_progress`);

    for (const reservation of confirmedToInProgress.rows) {
      try {
        await client.query(`
          UPDATE reservations 
          SET status = 'in_progress',
              updated_at = NOW()
          WHERE id = $1
        `, [reservation.id]);

        console.log(`✅ [STATES] Reserva ${reservation.id}: confirmed → in_progress`);
      } catch (error) {
        console.error(`❌ [STATES] Error actualizando reserva ${reservation.id}:`, error);
      }
    }

    // Also transition añadida → in_progress when time arrives (for DB consistency)
    const addedToInProgress = await client.query(`
      SELECT r.id
      FROM reservations r
      WHERE r.status = 'añadida'
        AND r.date::date <= CURRENT_DATE
        AND (
          r.date::date < CURRENT_DATE
          OR
          (r.date::date = CURRENT_DATE AND 
           (r.time::jsonb->>'hour')::int * 60 + (r.time::jsonb->>'minute')::int 
           <= EXTRACT(HOUR FROM CURRENT_TIMESTAMP) * 60 + EXTRACT(MINUTE FROM CURRENT_TIMESTAMP))
        )
      LIMIT 100
    `);

    console.log(`✅ [STATES] Encontradas ${addedToInProgress.rows.length} reservas añadida → in_progress`);

    for (const reservation of addedToInProgress.rows) {
      try {
        await client.query(`
          UPDATE reservations 
          SET status = 'in_progress_added',
              updated_at = NOW()
          WHERE id = $1
        `, [reservation.id]);
        console.log(`✅ [STATES] Reserva añadida ${reservation.id}: añadida → in_progress_added`);
      } catch (error) {
        console.error(`❌ [STATES] Error actualizando reserva añadida ${reservation.id}:`, error);
      }
    }

    // Transition in_progress_added → completed with auto-rating 4 (after 30 min)
    const addedInProgressToCompleted = await client.query(`
      SELECT 
        r.id, 
        r.client_id,
        r.restaurant_id
      FROM reservations r
      WHERE r.status = 'in_progress_added'
        AND (
          r.date::date < CURRENT_DATE
          OR
          (r.date::date = CURRENT_DATE AND 
           EXTRACT(HOUR FROM CURRENT_TIMESTAMP) * 60 + EXTRACT(MINUTE FROM CURRENT_TIMESTAMP)
           >= (r.time::jsonb->>'hour')::int * 60 + (r.time::jsonb->>'minute')::int + 30)
        )
      LIMIT 100
    `);

    console.log(`✅ [STATES] Encontradas ${addedInProgressToCompleted.rows.length} reservas in_progress_added → completed`);

    let defaultRatingsForAdded: any = {};
    if (addedInProgressToCompleted.rows.length > 0) {
      try {
        const criteriaResult = await client.query(
          'SELECT id, default_value FROM rating_criteria WHERE is_active = true ORDER BY order_num'
        );
        criteriaResult.rows.forEach((c: any) => {
          defaultRatingsForAdded[c.id] = c.default_value || 4;
        });
      } catch (e) {
        console.error('[STATES] Error obteniendo criterios de rating para añadidas:', e);
      }
    }

    for (const reservation of addedInProgressToCompleted.rows) {
      try {
        const ratingAverage = 4.0;
        const ratingId = `rating-auto-added-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
          await client.query(`
            INSERT INTO client_ratings (
              id, restaurant_id, client_id, reservation_id,
              rating_average, ratings, was_no_show, auto_rated, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, false, true, NOW())
          `, [ratingId, reservation.restaurant_id, reservation.client_id, reservation.id, ratingAverage, JSON.stringify(defaultRatingsForAdded)]);
        } catch (ratingInsertErr) {
          console.error(`[STATES] Error insertando rating para añadida ${reservation.id}:`, ratingInsertErr);
        }

        try {
          const clientResult = await client.query(
            'SELECT rating, total_ratings, local_ratings FROM clients WHERE id = $1',
            [reservation.client_id]
          );
          if (clientResult.rows.length > 0) {
            const c = clientResult.rows[0];
            const currentRating = parseFloat(c.rating) || 0;
            const totalRatings = parseInt(c.total_ratings) || 0;
            const newTotal = totalRatings + 1;
            const newRating = Number((((currentRating * totalRatings) + ratingAverage) / newTotal).toFixed(1));

            await client.query(
              'UPDATE clients SET rating = $1, total_ratings = $2, updated_at = NOW() WHERE id = $3',
              [newRating, newTotal, reservation.client_id]
            );

            let localRatings: any = {};
            try {
              localRatings = typeof c.local_ratings === 'string' ? JSON.parse(c.local_ratings) : (c.local_ratings || {});
            } catch {}

            const restRatings = localRatings[reservation.restaurant_id] || { sum: 0, count: 0 };
            const newSum = (restRatings.sum || 0) + ratingAverage;
            const newCount = (restRatings.count || 0) + 1;
            localRatings[reservation.restaurant_id] = {
              sum: newSum,
              count: newCount,
              average: Number((newSum / newCount).toFixed(1)),
            };

            await client.query(
              'UPDATE clients SET local_ratings = $1 WHERE id = $2',
              [JSON.stringify(localRatings), reservation.client_id]
            );
          }
        } catch (clientUpdateErr) {
          console.error(`[STATES] Error actualizando rating del cliente para ${reservation.id}:`, clientUpdateErr);
        }

        await client.query(`
          UPDATE reservations 
          SET status = 'completed',
              client_rated = true,
              client_ratings = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(defaultRatingsForAdded), reservation.id]);

        console.log(`✅ [STATES] Reserva añadida ${reservation.id}: in_progress_added → completed con rating automático 4.0`);
      } catch (error) {
        console.error(`❌ [STATES] Error procesando reserva añadida ${reservation.id}:`, error);
      }
    }

    const inProgressToRatable = await client.query(`
      SELECT 
        r.id, 
        r.date, 
        r.time,
        (r.time::jsonb->>'hour')::int as time_hour,
        (r.time::jsonb->>'minute')::int as time_minute
      FROM reservations r
      WHERE r.status = 'in_progress'
        AND (
          r.date::date < CURRENT_DATE
          OR
          (r.date::date = CURRENT_DATE AND 
           EXTRACT(HOUR FROM CURRENT_TIMESTAMP) * 60 + EXTRACT(MINUTE FROM CURRENT_TIMESTAMP) 
           >= (r.time::jsonb->>'hour')::int * 60 + (r.time::jsonb->>'minute')::int + 30)
        )
      LIMIT 100
    `);

    console.log(`✅ [STATES] Encontradas ${inProgressToRatable.rows.length} reservas in_progress → ratable`);

    for (const reservation of inProgressToRatable.rows) {
      try {
        const timeHour = parseInt(reservation.time_hour);
        const timeMinute = parseInt(reservation.time_minute);
        
        if (isNaN(timeHour) || isNaN(timeMinute)) {
          console.error(`❌ [STATES] Time inválido en reserva ${reservation.id}`);
          continue;
        }
        
        const resDate = new Date(reservation.date);
        resDate.setHours(timeHour, timeMinute, 0, 0);
        
        if (isNaN(resDate.getTime())) {
          console.error(`❌ [STATES] Fecha inválida para reserva ${reservation.id}`);
          continue;
        }
        
        const ratingDeadline = new Date(resDate.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000);

        if (isNaN(ratingDeadline.getTime())) {
          console.error(`❌ [STATES] Rating deadline inválido para reserva ${reservation.id}`);
          continue;
        }

        await client.query(`
          UPDATE reservations 
          SET status = 'ratable',
              rating_deadline = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [ratingDeadline.toISOString(), reservation.id]);

        console.log(`✅ [STATES] Reserva ${reservation.id}: in_progress → ratable, deadline: ${ratingDeadline.toISOString()}`);

      } catch (error) {
        console.error(`❌ [STATES] Error actualizando reserva ${reservation.id}:`, error);
      }
    }

    return confirmedToInProgress.rows.length + inProgressToRatable.rows.length + addedInProgressToCompleted.rows.length;
  } catch (error) {
    console.error('❌ [STATES] Error en worker:', error);
    throw error;
  } finally {
    client.release();
    isReservationCompletionRunning = false;
  }
}

export function startReservationCompletionWorker() {
  if (reservationCompletionInterval) {
    return;
  }

  console.log('🚀 [STATES] Worker de estados de reservas iniciado');
  
  void updateReservationStates().catch(error => {
    console.error('❌ [STATES] Error en ejecución inicial:', error);
  });
  
  reservationCompletionInterval = setInterval(async () => {
    try {
      const count = await updateReservationStates();
      if (count > 0) {
        console.log(`✅ [STATES] Procesadas ${count} reservas en este ciclo`);
      }
    } catch (error) {
      console.error('❌ [STATES] Error en ciclo del worker:', error);
    }
  }, 180000);
}
