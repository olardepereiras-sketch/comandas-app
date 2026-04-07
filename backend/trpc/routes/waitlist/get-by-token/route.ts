import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getWaitlistByTokenProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('[WAITLIST GET TOKEN] Buscando entrada por token:', input.token);

    const result = await ctx.db.query(
      `SELECT w.*, r.name as restaurant_name, r.slug as restaurant_slug, r.address as restaurant_address
       FROM waitlist w
       JOIN restaurants r ON r.id = w.restaurant_id
       WHERE w.confirmation_token = $1`,
      [input.token]
    );

    if (result.rows.length === 0) {
      console.log('[WAITLIST GET TOKEN] No encontrado');
      return null;
    }

    const entry = result.rows[0];
    console.log('[WAITLIST GET TOKEN] Encontrado:', entry.id, 'status:', entry.status);

    return {
      id: entry.id as string,
      restaurantId: entry.restaurant_id as string,
      restaurantName: entry.restaurant_name as string,
      restaurantSlug: entry.restaurant_slug as string,
      restaurantAddress: entry.restaurant_address as string,
      clientPhone: entry.client_phone as string,
      clientName: entry.client_name as string,
      date: entry.date as string,
      guests: entry.guests as number,
      locationId: entry.location_id as string | null,
      notes: entry.notes as string,
      needsHighChair: entry.needs_high_chair as boolean,
      highChairCount: entry.high_chair_count as number,
      needsStroller: entry.needs_stroller as boolean,
      hasPets: entry.has_pets as boolean,
      preferredTime: entry.preferred_time as string | null,
      status: entry.status as string,
      confirmationToken: entry.confirmation_token as string,
      confirmedAt: entry.confirmed_at as string | null,
      pendingExpiresAt: entry.pending_expires_at as string | null,
      createdAt: entry.created_at as string,
    };
  });
