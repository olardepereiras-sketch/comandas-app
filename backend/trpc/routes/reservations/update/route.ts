import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { sendReservationNotifications } from '../../../../services/email';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const updateReservationProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
      date: z.string().optional(),
      time: z.object({
        hour: z.number(),
        minute: z.number(),
      }).optional(),
      guests: z.number().optional(),
      tableIds: z.array(z.string()).optional(),
      needsHighChair: z.boolean().optional(),
      needsStroller: z.boolean().optional(),
      hasPets: z.boolean().optional(),
      clientNotes: z.string().optional(),
      modifiedBy: z.enum(['client', 'restaurant']).default('client'),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE RESERVATION] Actualizando reserva:', input.reservationId);

    const reservationResult = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.date !== undefined) {
      updates.push(`date = $${paramCount++}`);
      params.push(input.date);
    }

    if (input.time !== undefined) {
      updates.push(`time = $${paramCount++}`);
      params.push(JSON.stringify(input.time));
    }

    if (input.guests !== undefined) {
      updates.push(`guests = $${paramCount++}`);
      params.push(input.guests);
    }

    if (input.tableIds !== undefined) {
      updates.push(`table_ids = $${paramCount++}`);
      params.push(JSON.stringify(input.tableIds));
    }

    if (input.needsHighChair !== undefined) {
      updates.push(`needs_high_chair = $${paramCount++}`);
      params.push(input.needsHighChair);
    }

    if (input.needsStroller !== undefined) {
      updates.push(`needs_stroller = $${paramCount++}`);
      params.push(input.needsStroller);
    }

    if (input.hasPets !== undefined) {
      updates.push(`has_pets = $${paramCount++}`);
      params.push(input.hasPets);
    }

    if (input.clientNotes !== undefined) {
      updates.push(`client_notes = $${paramCount++}`);
      params.push(input.clientNotes);
    }

    updates.push(`notes = $${paramCount++}`);
    params.push(`Reserva modificada por el ${input.modifiedBy === 'client' ? 'cliente' : 'restaurante'}`);

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date().toISOString());

    params.push(input.reservationId);
    const whereIndex = paramCount;

    const sql = `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${whereIndex}`;

    await ctx.db.query(sql, params);

    const updatedReservation = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    const reservation = updatedReservation.rows[0];

    if (input.modifiedBy === 'restaurant') {
      try {
        const restaurantResult = await ctx.db.query(
          'SELECT r.name, r.email, r.phone, r.notification_phones, r.notification_email, r.whatsapp_custom_message, r.auto_send_whatsapp FROM restaurants r WHERE r.id = $1',
          [reservation.restaurant_id]
        );
        
        if (restaurantResult.rows.length > 0) {
          const restaurant = restaurantResult.rows[0];
          const time = JSON.parse(reservation.time);
          const timeString = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
          
          await sendReservationNotifications({
            restaurantId: reservation.restaurant_id,
            restaurantName: restaurant.name,
            restaurantEmail: restaurant.email,
            restaurantPhone: restaurant.phone ? JSON.parse(restaurant.phone)[0] : undefined,
            clientName: reservation.client_name,
            clientPhone: reservation.client_phone,
            clientEmail: reservation.client_email,
            date: reservation.date,
            time: timeString,
            guests: reservation.guests,
            locationName: reservation.location_name || 'Restaurante',
            notes: 'Reserva modificada por el restaurante',
            needsHighChair: reservation.needs_high_chair,
            needsStroller: reservation.needs_stroller,
            hasPets: reservation.has_pets,
            notificationPhones: restaurant.notification_phones ? JSON.parse(restaurant.notification_phones) : undefined,
            notificationEmail: restaurant.notification_email,
            whatsappCustomMessage: restaurant.whatsapp_custom_message,
            autoSendWhatsapp: restaurant.auto_send_whatsapp,
            reservationId: reservation.id,
            confirmationToken: reservation.token,
          });
          console.log('✅ [UPDATE RESERVATION] Notificación de modificación enviada');
        }
      } catch (error) {
        console.error('❌ [UPDATE RESERVATION] Error enviando notificación:', error);
      }
    }

    console.log('✅ [UPDATE RESERVATION] Reserva actualizada');

    // ── Waitlist processing: if time changed, old time slot may now have capacity ──
    try {
      const originalReservation = reservationResult.rows[0] as any;
      const oldTime = typeof originalReservation.time === 'string'
        ? JSON.parse(originalReservation.time)
        : originalReservation.time;
      const newTime = input.time || oldTime;
      const timeChanged = input.time && (oldTime.hour !== newTime.hour || oldTime.minute !== newTime.minute);
      const tableIdsChanged = input.tableIds !== undefined;

      if (timeChanged || tableIdsChanged) {
        console.log('🔍 [UPDATE RESERVATION] Cambio de hora/mesa detectado, verificando lista de espera...');

        const getLocalDateStr = (d: any): string => {
          if (typeof d === 'string') return d.split('T')[0];
          if (d instanceof Date) {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${y}-${mo}-${da}`;
          }
          return String(d).split('T')[0];
        };
        const reservationDateStr = getLocalDateStr(originalReservation.date);

        const waitlistResult = await ctx.db.query(
          `SELECT w.*, r.name as restaurant_name, r.slug as restaurant_slug, r.use_whatsapp_web as restaurant_use_whatsapp_web,
                  r.notification_phones as restaurant_notification_phones
           FROM waitlist w
           JOIN restaurants r ON r.id = w.restaurant_id
           WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
           ORDER BY COALESCE(w.confirmed_at, w.created_at) ASC`,
          [originalReservation.restaurant_id, reservationDateStr]
        );

        if (waitlistResult.rows.length > 0) {
          console.log(`🔍 [UPDATE RESERVATION] ${waitlistResult.rows.length} entradas en lista de espera`);

          for (const wlEntry of waitlistResult.rows) {
            const wlGuests = wlEntry.guests as number;
            const wlPreferredTime = wlEntry.preferred_time as string | null;
            let wlReservationTime: { hour: number; minute: number };
            if (wlPreferredTime) {
              const parts = wlPreferredTime.split(':').map(Number);
              wlReservationTime = { hour: parts[0] || 21, minute: parts[1] || 0 };
            } else {
              wlReservationTime = { hour: oldTime.hour || 21, minute: oldTime.minute || 0 };
            }

            const wlLocationId = wlEntry.location_id as string | null;
            let wlTablesQuery = `SELECT * FROM tables WHERE restaurant_id = $1
              AND (is_temporary IS NOT TRUE)
              AND min_capacity <= $2 AND max_capacity >= $2`;
            const wlTablesParams: any[] = [originalReservation.restaurant_id, wlGuests];
            if (wlLocationId) {
              wlTablesQuery += ' AND location_id = $3';
              wlTablesParams.push(wlLocationId);
            }
            wlTablesQuery += ' ORDER BY priority DESC';
            const wlTablesResult = await ctx.db.query(wlTablesQuery, wlTablesParams);

            const wlSlotTime = wlReservationTime.hour * 60 + wlReservationTime.minute;
            const existingRes = await ctx.db.query(
              `SELECT r.table_ids, r.time, COALESCE(t.rotation_time_minutes, 120) as rotation_time_minutes
               FROM reservations r
               LEFT JOIN tables t ON t.id = ANY(string_to_array(trim(both '[]' from r.table_ids::text), ',')::text[])
               WHERE r.restaurant_id = $1 AND r.date::date = $2::date AND r.status != 'cancelled'`,
              [originalReservation.restaurant_id, reservationDateStr]
            );

            const wlOccupiedTableIds = new Set<string>();
            for (const res of existingRes.rows) {
              const resTime = typeof res.time === 'string' ? JSON.parse(res.time) : res.time;
              const resTimeMin = (resTime.hour as number) * 60 + (resTime.minute as number);
              const rotMin = parseInt(res.rotation_time_minutes as string) || 120;
              if (Math.abs(wlSlotTime - resTimeMin) < rotMin) {
                const tIds = typeof res.table_ids === 'string' ? JSON.parse(res.table_ids) : res.table_ids;
                if (Array.isArray(tIds)) tIds.forEach((id: string) => wlOccupiedTableIds.add(id));
              }
            }

            let assignedTableId: string | null = null;
            for (const table of wlTablesResult.rows) {
              if (!wlOccupiedTableIds.has(table.id as string)) {
                assignedTableId = table.id as string;
                break;
              }
            }

            if (!assignedTableId) continue;

            let wlClientId: string;
            const wlClientResult = await ctx.db.query('SELECT id FROM clients WHERE phone = $1', [wlEntry.client_phone]);
            if (wlClientResult.rows.length > 0) {
              wlClientId = wlClientResult.rows[0].id as string;
            } else {
              wlClientId = `client-wl-${Date.now()}`;
              await ctx.db.query(
                `INSERT INTO clients (id, name, phone, email, rating, total_ratings, user_status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name`,
                [wlClientId, wlEntry.client_name, wlEntry.client_phone, 'sin-email@example.com', 4, 0, 'user_new', new Date(), new Date()]
              );
            }

            const locationRes2 = await ctx.db.query('SELECT name FROM table_locations WHERE id = $1', [wlLocationId]);
            const locationName2 = (locationRes2.rows[0]?.name as string) || 'Comedor';

            const newResId = `res-wl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const newToken = `wl-res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newToken2 = `wl-res2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            await ctx.db.query(
              `INSERT INTO reservations (id, restaurant_id, client_id, client_phone, client_name, client_email,
                  date, time, guests, location_id, location_name, table_ids, needs_high_chair, high_chair_count,
                  needs_stroller, has_pets, status, notes, client_notes, confirmation_token, confirmation_token2, token,
                  is_new_client, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                 'confirmed', $17, $17, $18, $19, $18, false, NOW(), NOW())`,
              [
                newResId,
                originalReservation.restaurant_id,
                wlClientId,
                wlEntry.client_phone,
                wlEntry.client_name,
                'sin-email@example.com',
                reservationDateStr,
                JSON.stringify(wlReservationTime),
                wlGuests,
                wlLocationId || '',
                locationName2,
                JSON.stringify([assignedTableId]),
                wlEntry.needs_high_chair || false,
                wlEntry.high_chair_count || 0,
                wlEntry.needs_stroller || false,
                wlEntry.has_pets || false,
                wlEntry.notes || '',
                newToken,
                newToken2,
              ]
            );

            await ctx.db.query(`UPDATE waitlist SET status = 'confirmed' WHERE id = $1`, [wlEntry.id]);

            const wlRestaurantName = (wlEntry.restaurant_name as string) || 'Restaurante';
            const wlUseWhatsApp = (wlEntry.restaurant_use_whatsapp_web as boolean) || false;
            const wlDateObj = new Date((wlEntry.date as string) + 'T12:00:00');
            const wlDateDisplay = wlDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const wlTimeStr = `${String(wlReservationTime.hour).padStart(2, '0')}:${String(wlReservationTime.minute).padStart(2, '0')}`;
            const wlReservationUrl = `https://quieromesa.com/client/reservation2/${newToken2}`;

            const wlSpecialNeeds: string[] = [];
            if (wlEntry.needs_high_chair && (wlEntry.high_chair_count || 0) > 0) wlSpecialNeeds.push(`🪑 ${wlEntry.high_chair_count as number} trona${(wlEntry.high_chair_count as number) !== 1 ? 's' : ''}`);
            if (wlEntry.needs_stroller) wlSpecialNeeds.push('🛒 Carrito de bebé');
            if (wlEntry.has_pets) wlSpecialNeeds.push('🐾 Con mascota');

            const clientConfirmMsg =
              `✅ *¡Reserva Confirmada desde Lista de Espera!*\n\n` +
              `Hola *${wlEntry.client_name as string}*, ¡enhorabuena! Se ha liberado una mesa y tu solicitud se ha convertido en una reserva confirmada en *${wlRestaurantName}*.\n\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `📅 *Fecha:* ${wlDateDisplay}\n` +
              `🕐 *Hora:* ${wlTimeStr}\n` +
              `👥 *Comensales:* ${wlGuests}\n` +
              (wlSpecialNeeds.length > 0 ? `✨ *Necesidades:* ${wlSpecialNeeds.join(', ')}\n` : '') +
              `━━━━━━━━━━━━━━━━━━\n\n` +
              `Gestiona tu reserva aquí:\n👉 ${wlReservationUrl}\n\n` +
              `Saludos,\n*${wlRestaurantName}*`;

            try {
              const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
              if (wlUseWhatsApp) {
                await notificationQueue.scheduleNotification({
                  restaurantId: originalReservation.restaurant_id as string,
                  reservationId: newResId,
                  recipientPhone: wlEntry.client_phone as string,
                  recipientName: wlEntry.client_name as string,
                  message: clientConfirmMsg,
                  notificationType: 'confirmation',
                  scheduledFor: new Date(),
                });
              } else {
                const { sendWhatsAppMessage } = await import('../../../../services/twilio');
                await sendWhatsAppMessage({ to: wlEntry.client_phone as string, message: clientConfirmMsg });
              }

              const notificationPhones: string[] = (() => {
                try {
                  const raw = wlEntry.restaurant_notification_phones;
                  if (!raw) return [];
                  return Array.isArray(raw) ? raw : JSON.parse(raw);
                } catch { return []; }
              })();

              for (const phone of notificationPhones) {
                const restaurantMsg =
                  `✅ *Nueva Reserva (Lista de Espera - modificación)*\n\n` +
                  `Se ha asignado una mesa liberada a un cliente en lista de espera:\n\n` +
                  `👤 *Cliente:* ${wlEntry.client_name as string}\n` +
                  `📅 *Fecha:* ${wlDateDisplay}\n` +
                  `🕐 *Hora:* ${wlTimeStr}\n` +
                  `👥 *Comensales:* ${wlGuests}\n` +
                  `📱 *Teléfono:* ${wlEntry.client_phone as string}`;
                await notificationQueue.scheduleNotification({
                  restaurantId: originalReservation.restaurant_id as string,
                  reservationId: newResId,
                  recipientPhone: phone,
                  recipientName: wlRestaurantName,
                  message: restaurantMsg,
                  notificationType: 'restaurant_new_reservation',
                  scheduledFor: new Date(),
                });
              }
            } catch (notifErr) {
              console.error('❌ [UPDATE RESERVATION] Error notificando lista espera:', notifErr);
            }

            console.log(`✅ [UPDATE RESERVATION] Lista espera procesada: reserva ${newResId} creada para ${wlEntry.client_phone as string}`);
            break;
          }
        }
      }
    } catch (waitlistError) {
      console.error('❌ [UPDATE RESERVATION] Error procesando lista de espera:', waitlistError);
    }

    return { success: true };
  });
