import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getReservationByToken2Procedure = publicProcedure
  .input(
    z.object({
      token2: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔍 [GET RESERVATION BY TOKEN2] Buscando reserva pendiente:', input.token2);

    const reservation = await ctx.db.query(
      `SELECT r.*, 
              c.name as client_name, 
              c.phone as client_phone,
              c.rating as client_rating,
              rest.name as restaurant_name,
              rest.slug as restaurant_slug,
              rest.phone as restaurant_phone,
              rest.min_modify_cancel_minutes,
              rest.google_maps_url,
              rest.whatsapp_custom_message,
              l.name as location_name,
              EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - (r.created_at AT TIME ZONE 'UTC'))) as seconds_since_created
       FROM reservations r
       JOIN clients c ON r.client_id = c.id
       JOIN restaurants rest ON r.restaurant_id = rest.id
       LEFT JOIN table_locations l ON r.location_id = l.id
       WHERE r.confirmation_token2 = $1`,
      [input.token2]
    );

    if (reservation.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const row = reservation.rows[0];

    const timeData = typeof row.time === 'string' 
      ? JSON.parse(row.time) 
      : row.time;

    console.log('✅ [GET RESERVATION BY TOKEN2] Reserva pendiente encontrada:', row.id);

    const restaurantPhoneArray = Array.isArray(row.restaurant_phone) 
      ? row.restaurant_phone 
      : (typeof row.restaurant_phone === 'string' ? JSON.parse(row.restaurant_phone) : []);
    
    const result = {
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      restaurantSlug: row.restaurant_slug,
      restaurantPhone: restaurantPhoneArray[0] || null,
      restaurantGoogleMapsUrl: row.google_maps_url || null,
      minModifyCancelMinutes: row.min_modify_cancel_minutes || 180,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      clientRating: row.client_rating || 0,
      date: row.date,
      time: timeData,
      guests: row.guests,
      status: row.status,
      notes: row.notes,
      clientNotes: row.client_notes,
      locationId: row.location_id,
      locationName: row.location_name,
      needsHighChair: row.needs_high_chair,
      highChairCount: row.high_chair_count,
      needsStroller: row.needs_stroller,
      hasPets: row.has_pets,
      confirmationToken: row.confirmation_token,
      confirmationToken2: row.confirmation_token2,
      fromRestaurantPanel: row.from_restaurant_panel || false,
      createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()) : new Date().toISOString(),
      secondsSinceCreated: Math.max(0, Math.round(Number(row.seconds_since_created) || 0)),
    };

    console.log('📤 [GET RESERVATION BY TOKEN2] Datos retornados:', JSON.stringify(result, null, 2));

    return result;
  });
