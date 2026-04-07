import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const searchReservationsByPhoneProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      phone: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔍 [SEARCH BY PHONE] Buscando reservas:', {
      restaurantId: input.restaurantId,
      phone: input.phone,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setHours(0, 0, 0, 0);
    const threeMonthsAgoString = threeMonthsAgo.toISOString().split('T')[0];

    const result = await ctx.pool.query(
      `SELECT 
        r.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        c.rating as client_rating
      FROM reservations r
      LEFT JOIN clients c ON r.client_id = c.id
      WHERE r.restaurant_id = $1 
        AND c.phone = $2
        AND (
          (r.date >= $3 AND r.date < $4)
          OR r.date >= $4
        )
        AND r.status != 'modified'
      ORDER BY r.date DESC, r.time DESC`,
      [input.restaurantId, input.phone, threeMonthsAgoString, todayString]
    );

    console.log('✅ [SEARCH BY PHONE] Reservas encontradas:', result.rows.length);
    console.log('📅 [SEARCH BY PHONE] Rango de fechas:', {
      desde: threeMonthsAgoString,
      hoy: todayString,
    });

    const reservations = result.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      clientId: row.client_id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      clientRating: row.client_rating || 0,
      date: row.date,
      time: typeof row.time === 'string' ? JSON.parse(row.time) : row.time,
      guests: row.guests,
      status: row.status,
      locationId: row.location_id,
      locationName: row.location_name,
      tableIds: row.table_ids ? (typeof row.table_ids === 'string' ? JSON.parse(row.table_ids) : row.table_ids) : [],
      tableNames: row.table_names ? (typeof row.table_names === 'string' ? JSON.parse(row.table_names) : row.table_names) : [],
      needsHighChair: row.needs_high_chair,
      highChairCount: row.high_chair_count || 0,
      needsStroller: row.needs_stroller,
      hasPets: row.has_pets,
      clientNotes: row.client_notes,
      restaurantNotes: row.restaurant_notes,
      token: row.token,
      confirmationToken: row.confirmation_token,
      clientRated: row.client_rated || false,
      clientRatings: row.client_ratings,
      wasNoShow: row.was_no_show || false,
      createdAt: row.created_at,
    }));

    return reservations;
  });
