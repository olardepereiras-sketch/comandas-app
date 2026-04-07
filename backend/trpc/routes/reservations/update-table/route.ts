import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';
import { getUnavailableTableIdsForSlot } from '../../../../services/table-availability';

export const updateReservationTableProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
      tableIds: z.array(z.string()),
      locationId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE RESERVATION TABLE] Actualizando mesa/ubicación:', input);

    if (input.tableIds.length === 0) {
      throw new Error('Debe seleccionar al menos una mesa. No se puede dejar la reserva sin mesa asignada.');
    }

    // Obtener información de la reserva actual
    const currentReservation = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    if (currentReservation.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const reservation = currentReservation.rows[0] as any;
    const reservationTime = typeof reservation.time === 'string' 
      ? JSON.parse(reservation.time) 
      : reservation.time;
    const slotTime = reservationTime.hour * 60 + reservationTime.minute;

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

    const unavailableTables = await getUnavailableTableIdsForSlot({
      db: ctx.db,
      restaurantId: reservation.restaurant_id as string,
      date: getLocalDateStr(reservation.date),
      slotTimeMinutes: slotTime,
      locationId: (input.locationId ?? reservation.location_id) as string | null,
      excludeReservationId: input.reservationId,
    });

    const conflictingOccupiedTables = input.tableIds.filter((tableId: string) => unavailableTables.occupiedTableIds.has(tableId));
    if (conflictingOccupiedTables.length > 0) {
      console.log('❌ [UPDATE RESERVATION TABLE] Mesas ocupadas por rotación/grupo/división:', conflictingOccupiedTables);
      throw new Error(`Las siguientes mesas no están disponibles en este horario: ${conflictingOccupiedTables.join(', ')}. Debe respetar el tiempo de rotación configurado, incluidas mesas agrupadas o divididas.`);
    }

    const conflictingBlockedTables = input.tableIds.filter((tableId: string) => unavailableTables.blockedTableIds.has(tableId));
    if (conflictingBlockedTables.length > 0) {
      console.log('❌ [UPDATE RESERVATION TABLE] Mesas bloqueadas:', conflictingBlockedTables);
      throw new Error(`Las siguientes mesas están bloqueadas y no se pueden adjudicar: ${conflictingBlockedTables.join(', ')}.`);
    }

    console.log('✅ [UPDATE RESERVATION TABLE] Mesas disponibles para asignación');

    const _currentStatus = reservation.status;
    const updateFields = [
      'table_ids = $1',
      'updated_at = $2',
    ];
    const params: any[] = [
      JSON.stringify(input.tableIds),
      new Date(),
    ];

    if (input.locationId) {
      updateFields.push(`location_id = $${params.length + 1}`);
      params.push(input.locationId);
    }

    params.push(input.reservationId);
    
    await ctx.db.query(
      `UPDATE reservations 
       SET ${updateFields.join(', ')}
       WHERE id = $${params.length}`,
      params
    );

    console.log('✅ [UPDATE RESERVATION TABLE] Mesa/ubicación actualizada');

    // Si hay locationId, actualizar el nombre de la ubicación
    if (input.locationId) {
      const locationResult = await ctx.db.query(
        'SELECT name FROM table_locations WHERE id = $1',
        [input.locationId]
      );
      if (locationResult.rows.length > 0) {
        await ctx.db.query(
          'UPDATE reservations SET location_name = $1 WHERE id = $2',
          [locationResult.rows[0].name, input.reservationId]
        );
      }
    }

    // ── Waitlist processing: check if old tables were freed ──
    try {
      const oldTableIds: string[] = (() => {
        try {
          const raw = reservation.table_ids;
          if (!raw) return [];
          if (typeof raw === 'string') return JSON.parse(raw);
          return Array.isArray(raw) ? raw : [];
        } catch { return []; }
      })();

      const freedTableIds = oldTableIds.filter((id: string) => !input.tableIds.includes(id));

      if (freedTableIds.length > 0) {
        console.log('🔍 [UPDATE TABLE] Mesas liberadas por cambio de mesa:', freedTableIds);

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
        const reservationDateStr = getLocalDateStr(reservation.date);

        let freedTableMaxCapacity = 999;
        const freedTableRes = await ctx.db.query(
          `SELECT SUM(max_capacity) as total_cap FROM tables WHERE id = ANY($1::text[])`,
          [freedTableIds]
        );
        freedTableMaxCapacity = parseInt(freedTableRes.rows[0]?.total_cap || '999') || 999;

        const waitlistResult = await ctx.db.query(
          `SELECT w.*, r.name as restaurant_name, r.slug as restaurant_slug, r.use_whatsapp_web as restaurant_use_whatsapp_web,
                  r.notification_phones as restaurant_notification_phones
           FROM waitlist w
           JOIN restaurants r ON r.id = w.restaurant_id
           WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
           ORDER BY COALESCE(w.confirmed_at, w.created_at) ASC`,
          [reservation.restaurant_id, reservationDateStr]
        );

        console.log(`🔍 [UPDATE TABLE] Lista espera encontrada: ${waitlistResult.rows.length} entradas`);

        for (const wlEntry of waitlistResult.rows) {
          const wlGuests = wlEntry.guests as number;
          if (wlGuests > freedTableMaxCapacity) {
            console.log(`⏭️ [UPDATE TABLE] Saltando entrada ${wlEntry.id as string}: ${wlGuests} pax > capacidad ${freedTableMaxCapacity}`);
            continue;
          }

          const wlPreferredTime = wlEntry.preferred_time as string | null;
          let wlReservationTime: { hour: number; minute: number };
          if (wlPreferredTime) {
            const parts = wlPreferredTime.split(':').map(Number);
            wlReservationTime = { hour: parts[0] || 21, minute: parts[1] || 0 };
          } else {
            wlReservationTime = { hour: reservationTime.hour || 21, minute: reservationTime.minute || 0 };
          }

          const wlLocationId = wlEntry.location_id as string | null;
          let wlTablesQuery = `SELECT * FROM tables WHERE restaurant_id = $1
            AND (is_temporary IS NOT TRUE)
            AND min_capacity <= $2 AND max_capacity >= $2`;
          const wlTablesParams: any[] = [reservation.restaurant_id, wlGuests];
          if (wlLocationId) {
            wlTablesQuery += ' AND location_id = $3';
            wlTablesParams.push(wlLocationId);
          }
          wlTablesQuery += ' ORDER BY priority DESC';
          const wlTablesResult = await ctx.db.query(wlTablesQuery, wlTablesParams);

          const wlSlotTime = wlReservationTime.hour * 60 + wlReservationTime.minute;
          const wlUnavailableTables = await getUnavailableTableIdsForSlot({
            db: ctx.db,
            restaurantId: reservation.restaurant_id as string,
            date: reservationDateStr,
            slotTimeMinutes: wlSlotTime,
            locationId: wlLocationId,
          });

          let assignedTableId: string | null = null;
          for (const table of wlTablesResult.rows) {
            const tableId = table.id as string;
            const isOccupied = wlUnavailableTables.occupiedTableIds.has(tableId);
            const isBlocked = wlUnavailableTables.blockedTableIds.has(tableId);
            if (!isOccupied && !isBlocked) {
              assignedTableId = tableId;
              break;
            }
            console.log('⏭️ [UPDATE TABLE] Mesa descartada para lista espera:', tableId, {
              isOccupied,
              isBlocked,
            });
          }

          if (!assignedTableId) {
            console.log(`⏭️ [UPDATE TABLE] Saltando entrada ${wlEntry.id as string}: no hay mesa libre para ${wlGuests} pax`);
            continue;
          }

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
                is_new_client, from_restaurant_panel, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
               'confirmed', $17, $17, $18, $19, $18, false, true, NOW(), NOW())`,
            [
              newResId,
              reservation.restaurant_id,
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
          const reservationUrl = `https://quieromesa.com/client/reservation2/${newToken2}`;

          const specialNeeds: string[] = [];
          if (wlEntry.needs_high_chair && (wlEntry.high_chair_count || 0) > 0) specialNeeds.push(`🪑 ${wlEntry.high_chair_count as number} trona${(wlEntry.high_chair_count as number) !== 1 ? 's' : ''}`);
          if (wlEntry.needs_stroller) specialNeeds.push('🛒 Carrito de bebé');
          if (wlEntry.has_pets) specialNeeds.push('🐾 Con mascota');

          const clientConfirmMsg =
            `✅ *¡Reserva Confirmada desde Lista de Espera!*\n\n` +
            `Hola *${wlEntry.client_name as string}*, ¡enhorabuena! Se ha liberado una mesa y tu solicitud se ha convertido en una reserva confirmada en *${wlRestaurantName}*.\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📅 *Fecha:* ${wlDateDisplay}\n` +
            `🕐 *Hora:* ${wlTimeStr}\n` +
            `👥 *Comensales:* ${wlGuests}\n` +
            (specialNeeds.length > 0 ? `✨ *Necesidades:* ${specialNeeds.join(', ')}\n` : '') +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `Gestiona tu reserva aquí:\n👉 ${reservationUrl}\n\n` +
            `Saludos,\n*${wlRestaurantName}*`;

          try {
            const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
            if (wlUseWhatsApp) {
              await notificationQueue.scheduleNotification({
                restaurantId: reservation.restaurant_id as string,
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
                `✅ *Nueva Reserva (Lista de Espera - cambio de mesa)*\n\n` +
                `Se ha asignado una mesa liberada a un cliente en lista de espera:\n\n` +
                `👤 *Cliente:* ${wlEntry.client_name as string}\n` +
                `📅 *Fecha:* ${wlDateDisplay}\n` +
                `🕐 *Hora:* ${wlTimeStr}\n` +
                `👥 *Comensales:* ${wlGuests}\n` +
                `📱 *Teléfono:* ${wlEntry.client_phone as string}`;
              await notificationQueue.scheduleNotification({
                restaurantId: reservation.restaurant_id as string,
                reservationId: newResId,
                recipientPhone: phone,
                recipientName: wlRestaurantName,
                message: restaurantMsg,
                notificationType: 'restaurant_new_reservation',
                scheduledFor: new Date(),
              });
            }
          } catch (notifErr) {
            console.error('❌ [UPDATE TABLE] Error notificando lista espera:', notifErr);
          }

          console.log(`✅ [UPDATE TABLE] Lista espera procesada: reserva ${newResId} creada para ${wlEntry.client_phone as string}`);
          break;
        }
      }
    } catch (waitlistError) {
      console.error('❌ [UPDATE TABLE] Error procesando lista de espera:', waitlistError);
    }

    return {
      success: true,
      message: 'Reserva actualizada correctamente',
    };
  });
