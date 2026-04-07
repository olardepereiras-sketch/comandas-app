import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const confirmWaitlistEntryProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('[WAITLIST CONFIRM] Confirmando entrada con token:', input.token);

    const result = await ctx.db.query(
      `SELECT w.*, r.name as restaurant_name, r.use_whatsapp_web
       FROM waitlist w
       JOIN restaurants r ON r.id = w.restaurant_id
       WHERE w.confirmation_token = $1`,
      [input.token]
    );

    if (result.rows.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitud no encontrada.' });
    }

    const entry = result.rows[0];

    if (entry.status === 'waiting') {
      return { success: true, alreadyConfirmed: true };
    }

    if (entry.status === 'expired' || entry.status === 'cancelled' || entry.status === 'confirmed') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta solicitud ya no está activa.' });
    }

    if (entry.status !== 'pending_confirmation') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta solicitud no se puede confirmar.' });
    }

    if (entry.pending_expires_at && new Date(entry.pending_expires_at) < new Date()) {
      await ctx.db.query(`UPDATE waitlist SET status = 'expired' WHERE id = $1`, [entry.id]);
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tu solicitud ha expirado. Por favor, vuelve a solicitar la lista de espera.' });
    }

    await ctx.db.query(
      `UPDATE waitlist SET status = 'waiting', confirmed_at = NOW() WHERE id = $1`,
      [entry.id]
    );

    console.log('[WAITLIST CONFIRM] ✅ Entrada confirmada:', entry.id as string);

    try {
      const restaurantName = (entry.restaurant_name as string) || 'El restaurante';
      const dateObj = new Date((entry.date as string) + 'T12:00:00');
      const dateDisplay = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });

      const specialNeeds: string[] = [];
      if (entry.needs_high_chair && (entry.high_chair_count || 0) > 0) {
        specialNeeds.push(`🪑 ${entry.high_chair_count as number} trona${(entry.high_chair_count as number) !== 1 ? 's' : ''}`);
      }
      if (entry.needs_stroller) specialNeeds.push('🛒 Carrito de bebé');
      if (entry.has_pets) specialNeeds.push('🐾 Con mascota');

      const clientMessage =
        `✅ *¡En Lista de Espera!*\n\n` +
        `Hola *${entry.client_name as string}*, tu solicitud ha sido confirmada. Estás en la lista de espera de *${restaurantName}*.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📅 *Fecha:* ${dateDisplay}\n` +
        (entry.preferred_time ? `🕐 *Horario preferido:* ${entry.preferred_time as string}\n` : '') +
        `👥 *Comensales:* ${entry.guests as number}\n` +
        (specialNeeds.length > 0 ? `✨ *Necesidades:* ${specialNeeds.join(', ')}\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `En cuanto se libere una mesa para tu solicitud, te enviaremos un mensaje con la confirmación de tu reserva.\n\n` +
        `Saludos,\n*${restaurantName}*`;

      if (entry.use_whatsapp_web) {
        const notifQueue = new WhatsAppNotificationQueue(ctx.db);
        await notifQueue.scheduleNotification({
          restaurantId: entry.restaurant_id as string,
          reservationId: `waitlist-confirmed-${entry.id as string}`,
          recipientPhone: entry.client_phone as string,
          recipientName: entry.client_name as string,
          message: clientMessage,
          notificationType: 'waitlist_confirmation',
          scheduledFor: new Date(),
        });
      } else {
        const { sendWhatsAppMessage } = await import('../../../../services/twilio');
        await sendWhatsAppMessage({ to: entry.client_phone as string, message: clientMessage });
      }

      try {
        const restaurantResult = await ctx.db.query(
          `SELECT id, notification_phones, use_whatsapp_web, auto_send_whatsapp FROM restaurants WHERE id = $1`,
          [entry.restaurant_id]
        );
        const restaurant = restaurantResult.rows[0];

        if (restaurant) {
          let notificationPhones: string[] = [];
          try {
            const raw = restaurant.notification_phones;
            if (Array.isArray(raw)) {
              notificationPhones = raw.filter((p: unknown) => typeof p === 'string' && p.trim().length > 0);
            } else if (typeof raw === 'string') {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                notificationPhones = parsed.filter((p: unknown) => typeof p === 'string' && (p as string).trim().length > 0);
              }
            }
          } catch {
            notificationPhones = [];
          }

          if (notificationPhones.length > 0) {
            const restaurantNotifMessage =
              `📋 *Nueva solicitud de lista de espera confirmada*\n\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `👤 *Cliente:* ${entry.client_name as string}\n` +
              `📱 *Teléfono:* ${entry.client_phone as string}\n` +
              `📅 *Fecha:* ${dateDisplay}\n` +
              (entry.preferred_time ? `🕐 *Horario preferido:* ${entry.preferred_time as string}\n` : '') +
              `👥 *Comensales:* ${entry.guests as number}\n` +
              (specialNeeds.length > 0 ? `✨ *Necesidades:* ${specialNeeds.join(', ')}\n` : '') +
              `━━━━━━━━━━━━━━━━━━\n\n` +
              `El cliente ha confirmado su solicitud y está esperando disponibilidad.`;

            const notifQueue = new WhatsAppNotificationQueue(ctx.db);
            for (const phone of notificationPhones) {
              if (restaurant.use_whatsapp_web) {
                await notifQueue.scheduleNotification({
                  restaurantId: entry.restaurant_id as string,
                  reservationId: `waitlist-restaurant-notif-${entry.id as string}-${phone}`,
                  recipientPhone: phone,
                  recipientName: restaurantName,
                  message: restaurantNotifMessage,
                  notificationType: 'waitlist_confirmation',
                  scheduledFor: new Date(),
                });
                console.log('[WAITLIST CONFIRM] ✅ Notificación al restaurante encolada para:', phone);
              } else if (restaurant.auto_send_whatsapp) {
                const { sendWhatsAppMessage } = await import('../../../../services/twilio');
                await sendWhatsAppMessage({ to: phone, message: restaurantNotifMessage });
                console.log('[WAITLIST CONFIRM] ✅ Notificación al restaurante enviada por Twilio a:', phone);
              }
            }
          } else {
            console.log('[WAITLIST CONFIRM] ⚠️ Restaurante sin teléfonos de notificación configurados, omitiendo notificación');
          }
        }
      } catch (restaurantNotifError) {
        console.error('[WAITLIST CONFIRM] Error enviando notificación al restaurante:', restaurantNotifError);
      }
    } catch (notifError) {
      console.error('[WAITLIST CONFIRM] Error enviando notificación:', notifError);
    }

    return { success: true, alreadyConfirmed: false };
  });
