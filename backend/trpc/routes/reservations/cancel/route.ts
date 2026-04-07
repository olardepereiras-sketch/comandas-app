import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';
import { sendCancellationNotification } from '../../../../services/email';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const cancelReservationProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
      reason: z.string().optional(),
      cancelledBy: z.enum(['restaurant', 'client']).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔴 [CANCEL RESERVATION] Raw input received:', JSON.stringify(input, null, 2));
    console.log('🔴 [CANCEL RESERVATION] Input type:', typeof input);
    console.log('🔴 [CANCEL RESERVATION] Input keys:', input ? Object.keys(input) : 'null/undefined');
    console.log('════════════════════════════════════════════════════════');
    console.log('🔵 [CANCEL RESERVATION] INICIO - Anulando reserva');
    console.log('Input:', input);
    console.log('Timestamp:', new Date().toISOString());
    console.log('════════════════════════════════════════════════════════');

    try {

      console.log('📋 Paso 1: Buscando reserva...');
      const reservation = await ctx.db.query(
        'SELECT * FROM reservations WHERE id = $1',
        [input.reservationId]
      );

      if (reservation.rows.length === 0) {
        console.log('❌ Error: Reserva no encontrada');
        throw new Error('Reserva no encontrada');
      }

      const reservationData = reservation.rows[0];
      console.log('✅ Reserva encontrada:', {
        id: reservationData.id,
        status: reservationData.status,
        client_id: reservationData.client_id,
        restaurant_id: reservationData.restaurant_id
      });

      // Auto-refund logic for restaurant-side cancellation
    let refundProcessed = false;
    let refundAmount = 0;
    try {
      const restaurantDepositResult = await ctx.db.query(
        'SELECT deposits_stripe_secret_key, deposits_auto_refund, deposits_cancellation_hours FROM restaurants WHERE id = $1',
        [reservationData.restaurant_id]
      );
      const depositConfig = restaurantDepositResult.rows[0];
      if (depositConfig?.deposits_auto_refund && depositConfig?.deposits_stripe_secret_key) {
        const depositOrderResult = await ctx.db.query(
          `SELECT * FROM deposit_orders WHERE reservation_id = $1 AND status = 'paid' LIMIT 1`,
          [input.reservationId]
        );
        let depositOrder = depositOrderResult.rows[0];
        if (!depositOrder) {
          const clientResult2 = await ctx.db.query(
            'SELECT phone FROM clients WHERE id = $1',
            [reservationData.client_id]
          );
          const clientPhone2 = clientResult2.rows[0]?.phone;
          if (clientPhone2) {
            const byPhoneResult = await ctx.db.query(
              `SELECT * FROM deposit_orders 
               WHERE restaurant_id = $1 AND client_phone = $2 AND reservation_date = $3 AND status = 'paid' 
               ORDER BY created_at DESC LIMIT 1`,
              [reservationData.restaurant_id, clientPhone2, reservationData.date]
            );
            depositOrder = byPhoneResult.rows[0];
          }
        }
        if (depositOrder && depositOrder.stripe_payment_intent_id) {
          const timeData2 = typeof reservationData.time === 'string' ? JSON.parse(reservationData.time) : reservationData.time;
          const reservationDateTime = new Date(reservationData.date);
          reservationDateTime.setHours(timeData2.hour, timeData2.minute, 0, 0);
          const nowForRefund = new Date();
          const hoursUntilReservation = (reservationDateTime.getTime() - nowForRefund.getTime()) / (1000 * 60 * 60);
          const cancellationHours = parseInt(depositConfig.deposits_cancellation_hours || '0');
          const isWithinRefundWindow = cancellationHours === 0 || hoursUntilReservation >= cancellationHours;
          if (isWithinRefundWindow) {
            const stripe = new Stripe(depositConfig.deposits_stripe_secret_key, {
              apiVersion: '2026-01-28.clover',
            });
            const refund = await stripe.refunds.create({
              payment_intent: depositOrder.stripe_payment_intent_id,
            });
            await ctx.db.query(
              `UPDATE deposit_orders SET status = 'refunded', refunded_at = NOW(), refund_id = $1, updated_at = NOW() WHERE id = $2`,
              [refund.id, depositOrder.id]
            );
            refundProcessed = true;
            refundAmount = parseFloat(depositOrder.total_amount || '0');
            console.log(`✅ [CANCEL] Devolución automática procesada: ${refund.id} - ${refundAmount}€`);
          } else {
            console.log(`⚠️ [CANCEL] Fuera del plazo de devolución (${hoursUntilReservation.toFixed(1)}h < ${cancellationHours}h requeridas)`);
          }
        }
      }
    } catch (refundError: any) {
      console.error('❌ [CANCEL] Error en devolución automática:', refundError.message);
    }

    console.log('📋 Paso 2: Eliminando recordatorios pendientes...');
      const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
      const deletedCount = await notificationQueue.deleteNotificationsForReservation(input.reservationId);
      console.log(`✅ ${deletedCount} recordatorios eliminados`);

      console.log('📋 Paso 3: Actualizando estado a cancelled...');
      const updateResult = await ctx.db.query(
        `UPDATE reservations 
         SET status = $1, notes = $2, updated_at = $3, cancelled_by = $4
         WHERE id = $5
         RETURNING *`,
        [
          'cancelled',
          input.reason ? `Anulada: ${input.reason}` : 'Reserva anulada por el restaurante',
          new Date(),
          input.cancelledBy || 'restaurant',
          input.reservationId,
        ]
      );
      console.log('✅ Reserva actualizada:', updateResult.rowCount, 'registros');

    const restaurantResult = await ctx.db.query(
      'SELECT name, slug FROM restaurants WHERE id = $1',
      [reservationData.restaurant_id]
    );

    const restaurantName = restaurantResult.rows[0]?.name || 'El restaurante';

    const timeData = typeof reservationData.time === 'string' 
      ? JSON.parse(reservationData.time) 
      : reservationData.time;
    const timeString = `${String(timeData.hour).padStart(2, '0')}:${String(timeData.minute).padStart(2, '0')}`;

    // Obtener configuración WhatsApp del restaurante
    const restaurantConfigResult = await ctx.db.query(
      'SELECT use_whatsapp_web, notification_phones, notification_email, email, enable_email_notifications FROM restaurants WHERE id = $1',
      [reservationData.restaurant_id]
    );
    
    const restaurantConfig = restaurantConfigResult.rows[0];
    const useWhatsAppWeb = restaurantConfig?.use_whatsapp_web || false;
    const notificationPhones = restaurantConfig?.notification_phones
      ? (Array.isArray(restaurantConfig.notification_phones) 
          ? restaurantConfig.notification_phones 
          : JSON.parse(restaurantConfig.notification_phones))
      : [];

    const clientResult = await ctx.db.query(
      'SELECT phone, name, email FROM clients WHERE id = $1',
      [reservationData.client_id]
    );

    if (clientResult.rows.length > 0) {
      const clientPhone = clientResult.rows[0].phone;
      const clientName = clientResult.rows[0].name;
      const clientEmail = clientResult.rows[0].email;

      console.log('📋 Paso 4: Notificando al cliente...');

      if (clientPhone) {
        try {
          const dateObj = new Date(reservationData.date);
          const dateString = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          
          const guestsInfo = [];
          if (reservationData.guests) guestsInfo.push(`${reservationData.guests} comensales`);
          if (reservationData.needs_high_chair) guestsInfo.push('+ tronas');
          if (reservationData.needs_stroller) guestsInfo.push('+ carrito');
          if (reservationData.has_pets) guestsInfo.push('+ mascota');

          const refundNoteClient = refundProcessed ? `\n\n💳 Se ha procesado una devolución automática de ${refundAmount.toFixed(2)}€` : '';
          const message = `❌ RESERVA CANCELADA\n\nHola ${clientName}, lamentamos informarle que su reserva en ${restaurantName} ha sido cancelada:\n\n📅 Fecha: ${dateString}\n🕐 Hora: ${timeString}\n👥 Comensales: ${guestsInfo.join(' ')}\n\n${input.reason ? `Motivo: ${input.reason}\n\n` : ''}Por favor, contacte al restaurante para más información.${refundNoteClient}\n\nDisculpe las molestias.`;
          
          if (useWhatsAppWeb) {
            try {
              await notificationQueue.scheduleNotification({
                restaurantId: reservationData.restaurant_id,
                reservationId: input.reservationId,
                recipientPhone: clientPhone,
                recipientName: clientName,
                message,
                notificationType: 'cancellation',
                scheduledFor: new Date(),
              });
              console.log('✅ [CANCEL RESERVATION] Notificación de cancelación encolada correctamente');
            } catch (queueError) {
              console.error('❌ [CANCEL RESERVATION] Error encolando notificación:', queueError);
            }
          } else {
            const { sendWhatsAppMessage } = await import('../../../../services/twilio');
            await sendWhatsAppMessage({
              to: clientPhone,
              message,
            });
            console.log('✅ [CANCEL RESERVATION] Notificación WhatsApp (Twilio) enviada al cliente');
          }
        } catch (error) {
          console.error('❌ [CANCEL RESERVATION] Error enviando WhatsApp:', error);
        }
      }

      try {
        const dateObj2 = new Date(reservationData.date);
        const dayName2 = dateObj2.toLocaleDateString('es-ES', { weekday: 'long' });
        const day2 = String(dateObj2.getDate()).padStart(2, '0');
        const month2 = String(dateObj2.getMonth() + 1).padStart(2, '0');
        const year2 = dateObj2.getFullYear();
        const formattedDate2 = `${dayName2}, ${day2}/${month2}/${year2}`;
        
        const guestsInfo2 = [];
        if (reservationData.guests) guestsInfo2.push(`${reservationData.guests} comensales`);
        if (reservationData.needs_high_chair) guestsInfo2.push('+ tronas');
        if (reservationData.needs_stroller) guestsInfo2.push('+ carrito');
        if (reservationData.has_pets) guestsInfo2.push('+ mascota');

        const emailWhatsAppMessage = `❌ RESERVA CANCELADA\n\nHola ${clientName}, lamentamos informarle que su reserva en ${restaurantName} ha sido cancelada:\n\n📅 Fecha: ${formattedDate2}\n🕐 Hora: ${timeString}\n👥 Comensales: ${guestsInfo2.join(' ')}\n\n${input.reason ? `Motivo: ${input.reason}\n\n` : ''}Por favor, contacte al restaurante para más información.\n\nDisculpe las molestias.`;

        const restaurantNotifEmail = restaurantConfig?.notification_email || restaurantConfig?.email;
        if (restaurantConfig?.enable_email_notifications && restaurantNotifEmail) {
          await sendCancellationNotification({
            restaurantName,
            clientName,
            clientEmail,
            clientPhone,
            date: reservationData.date,
            time: timeString,
            reason: input.reason,
            reservationId: reservationData.id,
            whatsappMessage: emailWhatsAppMessage,
            restaurantNotificationEmail: restaurantNotifEmail,
          });
          console.log('✅ [CANCEL RESERVATION] Notificación email enviada al restaurante');
        }
      } catch (error) {
        console.error('❌ [CANCEL RESERVATION] Error enviando email:', error);
      }
    }

    console.log('📋 Paso 5: Mesa liberada automáticamente (status = cancelled)');

      try {
        console.log('📋 Paso 5b: Procesando lista de espera...');
        const getLocalDateStr = (d: any): string => {
          if (typeof d === 'string') return d.split('T')[0];
          if (d instanceof Date) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          }
          return String(d).split('T')[0];
        };
        const reservationDateStr = getLocalDateStr(reservationData.date);
        console.log(`🔍 [CANCEL] Buscando lista espera: restaurante=${reservationData.restaurant_id as string} fecha=${reservationDateStr}`);

        // Get freed table details to know capacity
        const cancelledTableIds: string[] = (() => {
          try {
            const raw = reservationData.table_ids;
            if (!raw) return [];
            if (typeof raw === 'string') return JSON.parse(raw);
            return Array.isArray(raw) ? raw : [];
          } catch { return []; }
        })();

        let freedTableMaxCapacity = 999;
        if (cancelledTableIds.length > 0) {
          const tableRes = await ctx.db.query(
            `SELECT SUM(max_capacity) as total_cap FROM tables WHERE id = ANY($1::text[])`,
            [cancelledTableIds]
          );
          freedTableMaxCapacity = parseInt(tableRes.rows[0]?.total_cap || '999') || 999;
        }

        // Find waitlist entries in order of confirmed_at (order of arrival confirmation)
        const waitlistResult = await ctx.db.query(
          `SELECT w.*, r.name as restaurant_name, r.slug as restaurant_slug, r.use_whatsapp_web as restaurant_use_whatsapp_web
           FROM waitlist w
           JOIN restaurants r ON r.id = w.restaurant_id
           WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
           ORDER BY COALESCE(w.confirmed_at, w.created_at) ASC`,
          [reservationData.restaurant_id, reservationDateStr]
        );

        console.log(`🔍 [CANCEL] Lista espera encontrada: ${waitlistResult.rows.length} entradas`);

        // Find first entry that can be accommodated by the freed table
        let processedWaitlistEntry = false;
        for (const wlEntry of waitlistResult.rows) {
          const wlGuests = wlEntry.guests as number;
          if (wlGuests > freedTableMaxCapacity) {
            console.log(`⏭️ [CANCEL] Saltando entrada ${wlEntry.id as string}: ${wlGuests} comensales > capacidad ${freedTableMaxCapacity}`);
            continue;
          }

          // This entry can be accommodated — find a suitable table for it
          const wlPreferredTime = wlEntry.preferred_time as string | null;
          let reservationTime: { hour: number; minute: number };
          if (wlPreferredTime) {
            const parts = wlPreferredTime.split(':').map(Number);
            reservationTime = { hour: parts[0] || 21, minute: parts[1] || 0 };
          } else {
            const timeData = typeof reservationData.time === 'string' ? JSON.parse(reservationData.time) : reservationData.time;
            reservationTime = { hour: timeData.hour || 21, minute: timeData.minute || 0 };
          }

          // Find a compatible free table for this reservation time
          const wlLocationId = wlEntry.location_id as string | null;
          let tablesQuery = `SELECT * FROM tables WHERE restaurant_id = $1
            AND (is_temporary IS NOT TRUE)
            AND min_capacity <= $2 AND max_capacity >= $2`;
          const tablesParams: any[] = [reservationData.restaurant_id, wlGuests];
          if (wlLocationId) {
            tablesQuery += ' AND location_id = $3';
            tablesParams.push(wlLocationId);
          }
          tablesQuery += ' ORDER BY priority DESC';
          const tablesResult = await ctx.db.query(tablesQuery, tablesParams);

          const slotTime = reservationTime.hour * 60 + reservationTime.minute;
          const existingReservations = await ctx.db.query(
            `SELECT r.table_ids, r.time, COALESCE(t.rotation_time_minutes, 120) as rotation_time_minutes
             FROM reservations r
             LEFT JOIN tables t ON t.id = ANY(string_to_array(trim(both '[]' from r.table_ids::text), ',')::text[])
             WHERE r.restaurant_id = $1 AND r.date::date = $2::date AND r.status != 'cancelled' AND r.id != $3`,
            [reservationData.restaurant_id, reservationDateStr, input.reservationId]
          );

          const occupiedTableIds = new Set<string>();
          for (const res of existingReservations.rows) {
            const resTime = typeof res.time === 'string' ? JSON.parse(res.time) : res.time;
            const resTimeMin = (resTime.hour as number) * 60 + (resTime.minute as number);
            const rotMin = parseInt(res.rotation_time_minutes as string) || 120;
            if (Math.abs(slotTime - resTimeMin) < rotMin) {
              const tableIds = typeof res.table_ids === 'string' ? JSON.parse(res.table_ids) : res.table_ids;
              if (Array.isArray(tableIds)) tableIds.forEach((id: string) => occupiedTableIds.add(id));
            }
          }

          let assignedTableId: string | null = null;
          for (const table of tablesResult.rows) {
            if (!occupiedTableIds.has(table.id as string)) {
              assignedTableId = table.id as string;
              break;
            }
          }

          if (!assignedTableId) {
            console.log(`⏭️ [CANCEL] Saltando entrada ${wlEntry.id as string}: no hay mesa libre disponible para ${wlGuests} comensales a las ${reservationTime.hour}:${reservationTime.minute}`);
            continue;
          }

          // Verificar que no se supera el maxGuestsPerHour del turno
          try {
            const [dayOfWeekYear, dayOfWeekMonth, dayOfWeekDay] = reservationDateStr.split('-').map(Number);
            const dayOfWeek = new Date(dayOfWeekYear, dayOfWeekMonth - 1, dayOfWeekDay).getDay();

            let shiftsForDay: any[] = [];
            const wlExceptionResult = await ctx.db.query(
              'SELECT template_ids FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
              [reservationData.restaurant_id, reservationDateStr]
            );
            if (wlExceptionResult.rows.length > 0) {
              const raw = wlExceptionResult.rows[0].template_ids;
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
              if (Array.isArray(parsed)) shiftsForDay = parsed;
            } else {
              const wlScheduleResult = await ctx.db.query(
                'SELECT shifts FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
                [reservationData.restaurant_id, dayOfWeek]
              );
              if (wlScheduleResult.rows.length > 0) {
                const rawShifts = wlScheduleResult.rows[0].shifts;
                const parsedShifts = typeof rawShifts === 'string' ? JSON.parse(rawShifts) : (rawShifts || []);
                if (Array.isArray(parsedShifts)) shiftsForDay = parsedShifts;
              }
            }

            const slotMinutes = reservationTime.hour * 60 + reservationTime.minute;
            let maxGuestsPerHour = 999;
            for (const shift of shiftsForDay) {
              if (!shift.startTime || !shift.endTime) continue;
              const [sh, sm] = shift.startTime.split(':').map(Number);
              const [eh, em] = shift.endTime.split(':').map(Number);
              const shiftStartMin = sh * 60 + sm;
              const shiftEndMin = eh * 60 + em;
              if (slotMinutes >= shiftStartMin && slotMinutes <= shiftEndMin) {
                maxGuestsPerHour = shift.maxGuestsPerHour || 999;
                break;
              }
            }

            if (maxGuestsPerHour < 999) {
              const guestsAtSlotResult = await ctx.db.query(
                `SELECT SUM(guests) as total FROM reservations
                 WHERE restaurant_id = $1 AND date::date = $2::date
                 AND status NOT IN ('cancelled', 'modified')
                 AND (time::json->>'hour')::int = $3
                 AND (time::json->>'minute')::int = $4`,
                [reservationData.restaurant_id, reservationDateStr, reservationTime.hour, reservationTime.minute]
              );
              const currentGuestsAtSlot = parseInt(guestsAtSlotResult.rows[0]?.total || '0') || 0;
              if (currentGuestsAtSlot + wlGuests > maxGuestsPerHour) {
                console.log(`⏭️ [CANCEL] Saltando lista espera ${wlEntry.id as string}: excede maxGuestsPerHour (${currentGuestsAtSlot}+${wlGuests}>${maxGuestsPerHour}) a las ${reservationTime.hour}:${reservationTime.minute}`);
                continue;
              }
            }
          } catch (maxGuestsErr) {
            console.warn('⚠️ [CANCEL] No se pudo verificar maxGuestsPerHour para lista espera:', maxGuestsErr);
          }

          // Get client or create
          const wlRestaurantName = (wlEntry.restaurant_name as string) || restaurantName;
          const wlUseWhatsApp = (wlEntry.restaurant_use_whatsapp_web as boolean) || useWhatsAppWeb;

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

          const locationRes = await ctx.db.query('SELECT name FROM table_locations WHERE id = $1', [wlLocationId]);
          const locationName = (locationRes.rows[0]?.name as string) || 'Comedor';

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
              reservationData.restaurant_id,
              wlClientId,
              wlEntry.client_phone,
              wlEntry.client_name,
              'sin-email@example.com',
              reservationDateStr,
              JSON.stringify(reservationTime),
              wlGuests,
              wlLocationId || '',
              locationName,
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

          // Mark waitlist entry as confirmed
          await ctx.db.query(`UPDATE waitlist SET status = 'confirmed' WHERE id = $1`, [wlEntry.id]);

          // Notify client - confirmed reservation
          const wlDateObj = new Date((wlEntry.date as string) + 'T12:00:00');
          const wlDateDisplay = wlDateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const wlTimeStr = `${String(reservationTime.hour).padStart(2, '0')}:${String(reservationTime.minute).padStart(2, '0')}`;
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

          if (wlUseWhatsApp) {
            await notificationQueue.scheduleNotification({
              restaurantId: reservationData.restaurant_id as string,
              reservationId: newResId,
              recipientPhone: wlEntry.client_phone as string,
              recipientName: wlEntry.client_name as string,
              message: clientConfirmMsg,
              notificationType: 'confirmation',
              scheduledFor: new Date(),
            });
            console.log(`✅ [CANCEL] Reserva confirmada desde lista espera, notificación encolada para: ${wlEntry.client_phone as string}`);
          } else {
            try {
              const { sendWhatsAppMessage } = await import('../../../../services/twilio');
              await sendWhatsAppMessage({ to: wlEntry.client_phone as string, message: clientConfirmMsg });
            } catch (twilioErr) {
              console.error('❌ [CANCEL] Error Twilio lista espera:', twilioErr);
            }
          }

          // Notify restaurant about new confirmed reservation
          for (const phone of notificationPhones) {
            try {
              const restaurantMsg =
                `✅ *Nueva Reserva (Lista de Espera)*\n\n` +
                `Se ha asignado la mesa liberada a un cliente en lista de espera:\n\n` +
                `👤 *Cliente:* ${wlEntry.client_name as string}\n` +
                `📅 *Fecha:* ${wlDateDisplay}\n` +
                `🕐 *Hora:* ${wlTimeStr}\n` +
                `👥 *Comensales:* ${wlGuests}\n` +
                `📱 *Teléfono:* ${wlEntry.client_phone as string}`;
              await notificationQueue.scheduleNotification({
                restaurantId: reservationData.restaurant_id as string,
                reservationId: newResId,
                recipientPhone: phone,
                recipientName: wlRestaurantName,
                message: restaurantMsg,
                notificationType: 'restaurant_new_reservation',
                scheduledFor: new Date(),
              });
            } catch (err) {
              console.error('❌ [CANCEL] Error notificando restaurante lista espera:', err);
            }
          }

          console.log(`✅ [CANCEL] Lista espera procesada: reserva ${newResId} creada para ${wlEntry.client_phone as string}`);
          processedWaitlistEntry = true;
          break;
        }

        if (!processedWaitlistEntry) {
          console.log('ℹ️ [CANCEL] No se pudo asignar ninguna entrada de lista de espera');
        }
      } catch (waitlistError) {
        console.error('❌ [CANCEL] Error procesando lista de espera:', waitlistError);
      }

    // Notificar al restaurante (siempre, independientemente de quién cancela)
    if (notificationPhones.length > 0) {
      console.log('📋 Paso 6: Notificando al restaurante...');
      
      try {
        const dateObj = new Date(reservationData.date);
        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${dayName}, ${day}/${month}/${year}`;
        
        const totalGuests = parseInt(reservationData.guests);
        const highChairCount = parseInt(reservationData.high_chair_count) || 0;
        const adultsCount = totalGuests - highChairCount;
        
        let guestsDetail = `👥 Comensales: ${totalGuests} ${totalGuests === 1 ? 'comensal' : 'comensales'}\n`;
        if (adultsCount > 0 && highChairCount > 0) {
          guestsDetail += `  🧍🏻 ${adultsCount} ${adultsCount === 1 ? 'adulto' : 'adultos'} + 🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
        } else if (highChairCount > 0) {
          guestsDetail += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
        }
        if (reservationData.needs_stroller) {
          guestsDetail += `  🛒 Con carrito\n`;
        }
        if (reservationData.has_pets) {
          guestsDetail += `  🐾 Con mascota\n`;
        }

        const reservationNumber = reservationData.id.substring(reservationData.id.length - 8);
        const clientInfo = clientResult.rows[0];
        const cancelledByLabel = input.cancelledBy === 'client' ? 'El cliente' : 'El restaurante';
        const message = `❌ *RESERVA CANCELADA*\n\n${cancelledByLabel} ha cancelado la reserva de *${clientInfo.name}*:\n\n📅 Fecha: ${formattedDate}\n🕐 Hora: ${timeString}\n${guestsDetail}\n📱 Teléfono: ${clientInfo.phone || 'N/A'}\n🆔 Nº Reserva: ${reservationNumber}\n\n✅ La mesa ha sido liberada y está disponible nuevamente.`;

        if (useWhatsAppWeb) {
          for (const phone of notificationPhones) {
            try {
              await notificationQueue.scheduleNotification({
                restaurantId: reservationData.restaurant_id,
                reservationId: input.reservationId,
                recipientPhone: phone,
                recipientName: restaurantName,
                message,
                notificationType: 'restaurant_cancellation',
                scheduledFor: new Date(),
              });
              console.log(`✅ [CANCEL RESERVATION] Notificación encolada para ${phone}`);
            } catch (queueError) {
              console.error(`❌ [CANCEL RESERVATION] Error encolando para ${phone}:`, queueError);
            }
          }
        } else {
          const { sendWhatsAppMessage } = await import('../../../../services/twilio');
          for (const phone of notificationPhones) {
            try {
              await sendWhatsAppMessage({ to: phone, message });
              console.log(`✅ [CANCEL RESERVATION] Notificación Twilio enviada para ${phone}`);
            } catch (twilioErr) {
              console.error(`❌ [CANCEL RESERVATION] Error Twilio para ${phone}:`, twilioErr);
            }
          }
        }
      } catch (error) {
        console.error('❌ [CANCEL RESERVATION] Error notificando al restaurante:', error);
      }
    }

      console.log('════════════════════════════════════════════════════════');
      console.log('✅ [CANCEL RESERVATION] COMPLETADO EXITOSAMENTE');
      console.log('════════════════════════════════════════════════════════');

      return {
        success: true,
        message: 'Reserva anulada y cliente notificado',
      };
    } catch (error) {
      console.log('════════════════════════════════════════════════════════');
      console.log('❌ [CANCEL RESERVATION] ERROR CRÍTICO');
      console.log('Error:', error);
      console.log('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.log('════════════════════════════════════════════════════════');
      throw error;
    }
  });
