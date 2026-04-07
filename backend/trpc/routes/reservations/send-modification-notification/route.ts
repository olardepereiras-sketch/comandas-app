import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { generateClientWhatsAppMessage, sendRestaurantEmailNotification } from '../../../../services/email';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';

export const sendModificationNotificationProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SEND MOD NOTIF] Programando notificación de modificación para reserva:', input.reservationId);

    const reservationResult = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const reservation = reservationResult.rows[0];

    const restaurantResult = await ctx.db.query(
      `SELECT r.name, r.phone, r.whatsapp_custom_message, r.use_whatsapp_web,
              r.min_modify_cancel_minutes
       FROM restaurants r WHERE r.id = $1`,
      [reservation.restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new Error('Restaurante no encontrado');
    }

    const restaurant = restaurantResult.rows[0];

    if (!restaurant.use_whatsapp_web) {
      console.warn('[SEND MOD NOTIF] WhatsApp Web no activo para este restaurante');
      throw new Error('WhatsApp no configurado para este restaurante');
    }

    const time = JSON.parse(reservation.time);
    const timeString = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

    const confirmationToken = reservation.token || reservation.confirmation_token || '';

    let restaurantPhone: string | undefined;
    try {
      const phones = JSON.parse(restaurant.phone);
      restaurantPhone = Array.isArray(phones) ? phones[0] : restaurant.phone;
    } catch {
      restaurantPhone = restaurant.phone || undefined;
    }

    const baseMessage = generateClientWhatsAppMessage({
      restaurantName: restaurant.name,
      restaurantPhone,
      clientName: reservation.client_name,
      date: reservation.date,
      time: timeString,
      guests: reservation.guests,
      locationName: reservation.location_name || 'Restaurante',
      notes: undefined,
      needsHighChair: reservation.needs_high_chair,
      highChairCount: reservation.high_chair_count,
      needsStroller: reservation.needs_stroller,
      hasPets: reservation.has_pets,
      whatsappCustomMessage: restaurant.whatsapp_custom_message,
      reservationId: reservation.id,
      confirmationToken,
      minModifyCancelMinutes: restaurant.min_modify_cancel_minutes,
    });

    const baseWithoutHeader = baseMessage.replace('✅ *RESERVA CONFIRMADA*\n\n', '');
    const gestorSectionMarker = '\n━━━━━━━━━━━━━━━━━━\n🔗 *GESTIONAR RESERVA*';
    const gestorIdx = baseWithoutHeader.indexOf(gestorSectionMarker);
    const messageWithoutGestor = gestorIdx > -1 ? baseWithoutHeader.substring(0, gestorIdx) : baseWithoutHeader;
    const modifiedMessage = `✏️ *RESERVA MODIFICADA*\n\n` + messageWithoutGestor +
      `\n━━━━━━━━━━━━━━━━━━\n¡Esperamos verle pronto!\n\nSaludos cordiales,\n*${restaurant.name}*`;

    console.log('[SEND MOD NOTIF] Guardando notificación en cola para envío inmediato...');

    const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
    const scheduledFor = new Date(Date.now() + 5000);

    await notificationQueue.scheduleNotification({
      restaurantId: reservation.restaurant_id,
      reservationId: input.reservationId,
      recipientPhone: reservation.client_phone,
      recipientName: reservation.client_name,
      message: modifiedMessage,
      notificationType: 'reservation_modified',
      scheduledFor,
    });

    await ctx.db.query(
      `UPDATE reservations SET notes = $1 WHERE id = $2`,
      ['Reserva modificada (notificado)', input.reservationId]
    );

    console.log('✅ [SEND MOD NOTIF] Notificación programada en cola (envío en ~5s, reintentos cada minuto)');

    try {
      const restaurantEmailResult = await ctx.db.query(
        'SELECT notification_email, email, enable_email_notifications FROM restaurants WHERE id = $1',
        [reservation.restaurant_id]
      );
      const restData = restaurantEmailResult.rows[0];
      const restaurantNotifEmail = restData?.notification_email || restData?.email;
      if (restData?.enable_email_notifications && restaurantNotifEmail) {
        await sendRestaurantEmailNotification({
          restaurantEmail: restaurantNotifEmail,
          whatsappMessage: modifiedMessage,
          subject: `✏️ Reserva Modificada - ${restaurant.name}`,
          restaurantName: restaurant.name,
          clientName: reservation.client_name,
          clientPhone: reservation.client_phone,
        });
        console.log('✅ [SEND MOD NOTIF] Email de modificación enviado al restaurante');
      }
    } catch (emailError) {
      console.error('❌ [SEND MOD NOTIF] Error enviando email:', emailError);
    }

    return { success: true };
  });
