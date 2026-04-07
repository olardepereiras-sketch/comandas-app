import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import Stripe from 'stripe';
import { sendRestaurantEmailNotification } from '../../../../services/email';
import { createPendingReservationForWaitlist } from '../../../../services/waitlist-reservation-helper';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';


export const cancelReservationByClientProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CANCEL BY CLIENT] Anulando reserva por cliente:', input.token);

    const reservation = await ctx.db.query(
      `SELECT r.*, 
              c.name as client_name, 
              rest.name as restaurant_name,
              rest.phone as restaurant_phone,
              rest.min_modify_cancel_minutes,
              rest.use_whatsapp_web,
              rest.notification_phones,
              rest.deposits_stripe_secret_key,
              rest.deposits_auto_refund,
              rest.deposits_cancellation_hours
       FROM reservations r
       JOIN clients c ON r.client_id = c.id
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.confirmation_token = $1`,
      [input.token]
    );

    if (reservation.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const row = reservation.rows[0];

    if (row.status === 'cancelled') {
      throw new Error('Esta reserva ya está anulada');
    }

    const reservationDate = new Date(row.date);
    const timeData = typeof row.time === 'string' ? JSON.parse(row.time) : row.time;
    reservationDate.setHours(timeData.hour, timeData.minute, 0, 0);

    const now = new Date();
    const minModifyCancelMinutes = row.min_modify_cancel_minutes || 180;
    const minutesUntilReservation = (reservationDate.getTime() - now.getTime()) / (1000 * 60);
    const isFromRestaurantPanel = row.from_restaurant_panel === true;

    if (!isFromRestaurantPanel && minutesUntilReservation < minModifyCancelMinutes) {
      throw new Error(`No puede cancelar con menos de ${Math.floor(minModifyCancelMinutes / 60)} horas de antelación. Por favor, contacte al restaurante directamente.`);
    }

    if (isFromRestaurantPanel && minutesUntilReservation < 0) {
      throw new Error('No puede cancelar una reserva que ya ha pasado.');
    }

    // Eliminar notificaciones pendientes ANTES de cancelar
    try {
      const notifQueueDel = new WhatsAppNotificationQueue(ctx.db);
      const deletedCount = await notifQueueDel.deleteNotificationsForReservation(row.id as string);
      console.log(`✅ [CANCEL BY CLIENT] ${deletedCount} notificaciones pendientes eliminadas`);
    } catch (deleteErr) {
      console.error('❌ [CANCEL BY CLIENT] Error eliminando notificaciones pendientes:', deleteErr);
    }

    await ctx.db.query(
      `UPDATE reservations 
       SET status = $1, cancelled_by = $2, updated_at = $3
       WHERE id = $4`,
      ['cancelled', 'client', new Date(), row.id]
    );

    // Auto-refund logic
    let refundProcessed = false;
    let refundAmount = 0;

    try {
      if (row.deposits_auto_refund && row.deposits_stripe_secret_key) {
        const cancellationHours = parseInt(row.deposits_cancellation_hours || '0');
        const hoursUntilReservation = minutesUntilReservation / 60;

        const isWithinRefundWindow = cancellationHours === 0 || hoursUntilReservation >= cancellationHours;

        if (isWithinRefundWindow) {
          // Find paid deposit order for this reservation
          const depositOrderResult = await ctx.db.query(
            `SELECT * FROM deposit_orders WHERE reservation_id = $1 AND status = 'paid' LIMIT 1`,
            [row.id]
          );

          // Also try matching by date and phone if no reservation_id link
          let depositOrder = depositOrderResult.rows[0];
          if (!depositOrder) {
            const clientResult = await ctx.db.query(
              'SELECT phone FROM clients WHERE id = $1',
              [row.client_id]
            );
            const clientPhone = clientResult.rows[0]?.phone;
            if (clientPhone) {
              const byPhoneResult = await ctx.db.query(
                `SELECT * FROM deposit_orders 
                 WHERE restaurant_id = $1 AND client_phone = $2 AND reservation_date = $3 AND status = 'paid' 
                 ORDER BY created_at DESC LIMIT 1`,
                [row.restaurant_id, clientPhone, row.date]
              );
              depositOrder = byPhoneResult.rows[0];
            }
          }

          if (depositOrder && depositOrder.stripe_payment_intent_id) {
            const stripe = new Stripe(row.deposits_stripe_secret_key, {
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
            console.log(`✅ [CANCEL BY CLIENT] Devolución automática procesada: ${refund.id} - ${refundAmount}€`);
          }
        } else {
          console.log(`⚠️ [CANCEL BY CLIENT] Fuera del plazo de devolución (${hoursUntilReservation.toFixed(1)}h < ${cancellationHours}h requeridas)`);
        }
      }
    } catch (refundError: any) {
      console.error('❌ [CANCEL BY CLIENT] Error en devolución automática:', refundError.message);
    }

    const timeString = `${String(timeData.hour).padStart(2, '0')}:${String(timeData.minute).padStart(2, '0')}`;
    const dateObj = new Date(row.date);
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${dayName}, ${day}/${month}/${year}`;

    const useWhatsAppWeb = row.use_whatsapp_web || false;
    const notificationPhones = row.notification_phones
      ? (Array.isArray(row.notification_phones)
          ? row.notification_phones
          : JSON.parse(row.notification_phones))
      : [];

    if (useWhatsAppWeb && notificationPhones.length > 0) {
      const totalGuests = parseInt(row.guests);
      const highChairCount = parseInt(row.high_chair_count) || 0;
      const adultsCount = totalGuests - highChairCount;

      let guestsDetail = `👥 Comensales: ${totalGuests} ${totalGuests === 1 ? 'comensal' : 'comensales'}\n`;
      if (adultsCount > 0 && highChairCount > 0) {
        guestsDetail += `  🧍🏻 ${adultsCount} ${adultsCount === 1 ? 'adulto' : 'adultos'} + 🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      } else if (highChairCount > 0) {
        guestsDetail += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      }
      if (row.needs_stroller) guestsDetail += `  🛒 Con carrito\n`;
      if (row.has_pets) guestsDetail += `  🐾 Con mascota\n`;

      const reservationNumber = row.id.substring(row.id.length - 8);
      const refundNote = refundProcessed ? `\n💳 Devolución automática procesada: ${refundAmount.toFixed(2)}€` : '';
      const message = `❌ *RESERVA CANCELADA*\n\nEl cliente *${row.client_name}* ha cancelado su reserva:\n\n📅 Fecha: ${formattedDate}\n🕐 Hora: ${timeString}\n${guestsDetail}\n📱 Teléfono: ${row.phone || 'N/A'}\n🆔 Nº Reserva: ${reservationNumber}${refundNote}\n\n✅ La mesa ha sido liberada y está disponible nuevamente.`;

      try {
        const notifQueueRest = new WhatsAppNotificationQueue(ctx.db);
        for (const phone of notificationPhones) {
          try {
            await notifQueueRest.scheduleNotification({
              restaurantId: row.restaurant_id as string,
              reservationId: row.id as string,
              recipientPhone: phone as string,
              recipientName: (row.restaurant_name as string) || '',
              message,
              notificationType: 'restaurant_cancellation',
              scheduledFor: new Date(),
            });
            console.log(`✅ [CANCEL BY CLIENT] Notificación encolada para restaurante: ${phone}`);
          } catch (error) {
            console.error(`❌ [CANCEL BY CLIENT] Error encolando notificación a ${phone}:`, error);
          }
        }
      } catch (error) {
        console.error('❌ [CANCEL BY CLIENT] Error general encolando notificaciones:', error);
      }
    }

    try {
      const restaurantEmailResult = await ctx.db.query(
        'SELECT notification_email, email, enable_email_notifications FROM restaurants WHERE id = $1',
        [row.restaurant_id]
      );
      const restData = restaurantEmailResult.rows[0];
      const restaurantNotifEmail = restData?.notification_email || restData?.email;
      if (restData?.enable_email_notifications && restaurantNotifEmail) {
        const clientPhone = (await ctx.db.query('SELECT phone FROM clients WHERE id = $1', [row.client_id])).rows[0]?.phone || '';
        const refundNote = refundProcessed ? `\n\n💳 Se ha procesado una devolución automática de ${refundAmount.toFixed(2)}€` : '';
        const clientCancelMessage = `❌ RESERVA CANCELADA\n\nHola ${row.client_name},\n\nSu reserva en ${row.restaurant_name} ha sido cancelada correctamente.\n\n━━━━━━━━━━━━━━━━━━\n📅 Fecha: ${formattedDate}\n🕐 Hora: ${timeString}\n━━━━━━━━━━━━━━━━━━${refundNote}\n\nSi desea realizar una nueva reserva, visite nuestra página.\n\nSaludos cordiales,\n${row.restaurant_name}`;

        await sendRestaurantEmailNotification({
          restaurantEmail: restaurantNotifEmail,
          whatsappMessage: clientCancelMessage,
          subject: `❌ Reserva Cancelada por Cliente - ${row.restaurant_name}`,
          restaurantName: row.restaurant_name,
          clientName: row.client_name,
          clientPhone,
        });
        console.log('✅ [CANCEL BY CLIENT] Email de cancelación enviado al restaurante');
      }
    } catch (emailError) {
      console.error('❌ [CANCEL BY CLIENT] Error enviando email:', emailError);
    }

    // Notificar al CLIENTE sobre la cancelación
    if (useWhatsAppWeb) {
      try {
        const clientPhoneResult = await ctx.db.query(
          'SELECT phone FROM clients WHERE id = $1',
          [row.client_id]
        );
        const clientPhone = clientPhoneResult.rows[0]?.phone || row.client_phone;

        if (clientPhone && !clientPhone.startsWith('walkin-') && !clientPhone.startsWith('walk-')) {
          const refundNoteClient = refundProcessed ? `\n\n💳 Se ha procesado una devolución automática de ${refundAmount.toFixed(2)}€` : '';
          const clientMessage = `✅ *RESERVA CANCELADA*\n\nHola *${row.client_name}*, su reserva en *${row.restaurant_name}* ha sido cancelada correctamente.\n\n📅 Fecha: ${formattedDate}\n🕐 Hora: ${timeString}\n👥 ${row.guests} ${parseInt(row.guests) === 1 ? 'comensal' : 'comensales'}${refundNoteClient}\n\nSi desea realizar una nueva reserva, puede hacerlo desde nuestra web.\n\nHasta pronto 👋\n*${row.restaurant_name}*`;

          const notifQueueClient = new WhatsAppNotificationQueue(ctx.db);
          await notifQueueClient.scheduleNotification({
            restaurantId: row.restaurant_id as string,
            reservationId: row.id as string,
            recipientPhone: clientPhone as string,
            recipientName: row.client_name as string,
            message: clientMessage,
            notificationType: 'cancellation',
            scheduledFor: new Date(),
          });
          console.log(`✅ [CANCEL BY CLIENT] Notificación de cancelación encolada para cliente: ${clientPhone}`);
        }
      } catch (clientNotifError) {
        console.error('❌ [CANCEL BY CLIENT] Error enviando notificación al cliente:', clientNotifError);
      }
    }

    try {
      console.log('📋 [CANCEL BY CLIENT] Verificando lista de espera...');
      const notifQueue = new WhatsAppNotificationQueue(ctx.db);

      // Use local date methods to avoid UTC timezone shift issues
      const getLocalDateStr = (d: any): string => {
        if (typeof d === 'string') return d.split('T')[0];
        if (d instanceof Date) {
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          return `${y}-${mo}-${dy}`;
        }
        return String(d).split('T')[0];
      };
      const reservationDateStr = getLocalDateStr(row.date);
      console.log(`🔍 [CANCEL BY CLIENT] Buscando lista espera: restaurante=${row.restaurant_id as string} fecha=${reservationDateStr} (date original=${JSON.stringify(row.date)})`);

      const waitlistResult = await ctx.db.query(
        `SELECT w.*, r.name as restaurant_name
         FROM waitlist w
         JOIN restaurants r ON r.id = w.restaurant_id
         WHERE w.restaurant_id = $1 AND w.date = $2 AND w.status = 'waiting'
         ORDER BY w.created_at ASC
         LIMIT 1`,
        [row.restaurant_id, reservationDateStr]
      );

      if (waitlistResult.rows.length > 0) {
        const wlEntry = waitlistResult.rows[0];
        const wlRestaurantName = (wlEntry.restaurant_name as string) || row.restaurant_name;
        const wlDateObj = new Date((wlEntry.date as string) + 'T12:00:00');
        const wlDateDisplay = wlDateObj.toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        const preferredTimeLine = wlEntry.preferred_time ? `🕐 *Horario:* ${wlEntry.preferred_time as string}\n` : '';

        const pendingRes = await createPendingReservationForWaitlist(
          ctx.db,
          row.restaurant_id as string,
          wlEntry
        );

        const restaurantSlugResult = await ctx.db.query('SELECT slug FROM restaurants WHERE id = $1', [row.restaurant_id]);
        const restaurantSlug = restaurantSlugResult.rows[0]?.slug as string || '';
        const fallbackUrl = `https://quieromesa.com/client/restaurant/${restaurantSlug}`;
        const wlConfirmUrl = pendingRes?.confirmUrl || fallbackUrl;

        const wlMessage = pendingRes
          ? `🔔 *¡Mesa Disponible - Lista de Espera!*\n\n` +
            `Hola *${wlEntry.client_name as string}*, ¡buenas noticias! Se ha liberado una mesa en *${wlRestaurantName}*.\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📅 *Fecha:* ${wlDateDisplay}\n` +
            preferredTimeLine +
            `👥 *Comensales:* ${wlEntry.guests as number}\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `⏰ Tienes *15 minutos* para confirmar. Hemos preparado tu reserva, solo falta tu confirmación:\n\n` +
            `👉 ${wlConfirmUrl}\n\n` +
            `Si no confirmas en ese tiempo, pasaremos al siguiente en la lista.\n\n` +
            `Saludos,\n*${wlRestaurantName}*`
          : `🔔 *¡Disponibilidad en Lista de Espera!*\n\n` +
            `Hola *${wlEntry.client_name as string}*, ¡buenas noticias! Se ha liberado disponibilidad en *${wlRestaurantName}*.\n\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📅 *Fecha:* ${wlDateDisplay}\n` +
            preferredTimeLine +
            `👥 *Comensales solicitados:* ${wlEntry.guests as number}\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `⏰ Tienes *15 minutos* para confirmar tu reserva. Pulsa el enlace para reservar ahora:\n` +
            `👉 ${wlConfirmUrl}\n\n` +
            `Si no confirmas en ese tiempo, pasaremos al siguiente en la lista.\n\n` +
            `Saludos,\n*${wlRestaurantName}*`;

        if (useWhatsAppWeb) {
          await notifQueue.scheduleNotification({
            restaurantId: row.restaurant_id as string,
            reservationId: null,
            recipientPhone: wlEntry.client_phone as string,
            recipientName: wlEntry.client_name as string,
            message: wlMessage,
            notificationType: 'waitlist_available',
            scheduledFor: new Date(),
          });
          console.log(`✅ [CANCEL BY CLIENT] Lista espera encolada (WhatsApp Web) para: ${wlEntry.client_phone as string}`);
        } else {
          try {
            const { sendWhatsAppMessage } = await import('../../../../services/twilio');
            await sendWhatsAppMessage({ to: wlEntry.client_phone as string, message: wlMessage });
            console.log(`✅ [CANCEL BY CLIENT] Lista espera enviada (Twilio) a: ${wlEntry.client_phone as string}`);
          } catch (twilioErr) {
            console.error('❌ [CANCEL BY CLIENT] Error lista espera vía Twilio:', twilioErr);
          }
        }

        await ctx.db.query(
          `UPDATE waitlist SET notification_count = notification_count + 1, last_notified_at = NOW() WHERE id = $1`,
          [wlEntry.id]
        );
        console.log(`✅ [CANCEL BY CLIENT] Notificación lista espera procesada para: ${wlEntry.client_phone as string}`);
      } else {
        console.log('ℹ️ [CANCEL BY CLIENT] No hay lista de espera para esta fecha');
      }
    } catch (waitlistError) {
      console.error('❌ [CANCEL BY CLIENT] Error verificando lista de espera:', waitlistError);
    }

    console.log('✅ [CANCEL BY CLIENT] Reserva anulada por cliente exitosamente');

    return {
      success: true,
      message: 'Reserva cancelada correctamente',
      refundProcessed,
      refundAmount,
    };
  });
