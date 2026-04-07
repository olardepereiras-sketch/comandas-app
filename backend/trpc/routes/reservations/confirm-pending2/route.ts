import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';
import { sendRestaurantEmailNotification } from '../../../../services/email';

export const confirmPendingReservation2Procedure = publicProcedure
  .input(
    z.object({
      token2: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CONFIRM PENDING2] Confirmando reserva pendiente:', input.token2);

    const reservationResult = await ctx.db.query(
      `SELECT r.*, rest.name as restaurant_name, rest.use_whatsapp_web, rest.auto_send_whatsapp, rest.whatsapp_type, c.name as client_name, c.phone as client_phone
       FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       JOIN clients c ON r.client_id = c.id
       WHERE r.confirmation_token2 = $1 AND r.status = 'pending'`,
      [input.token2]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reserva no encontrada o ya confirmada');
    }

    const reservation = reservationResult.rows[0];

    await ctx.db.query(
      `UPDATE clients SET 
        terms_accepted_at = NOW(),
        whatsapp_notifications_accepted = true,
        data_storage_accepted = true,
        rating_accepted = true,
        user_status = 'user_conf'
       WHERE id = $1`,
      [reservation.client_id]
    );
    console.log('✅ [CONFIRM PENDING2] Cliente marcado como user_conf:', reservation.client_id);

    const currentTableIds = typeof reservation.table_ids === 'string' 
      ? JSON.parse(reservation.table_ids) 
      : reservation.table_ids;
    
    if (!currentTableIds || currentTableIds.length === 0) {
      console.log('⚠️ [CONFIRM PENDING2] Reserva sin mesas asignadas, buscando mesa disponible...');
      
      const tablesResult = await ctx.db.query(
        `SELECT t.id, t.name, t.min_capacity, t.max_capacity, t.priority
         FROM tables t
         WHERE t.restaurant_id = $1 
         AND t.location_id = $2
         AND t.min_capacity <= $3 
         AND t.max_capacity >= $3
         ORDER BY t.priority DESC, t.min_capacity ASC`,
        [reservation.restaurant_id, reservation.location_id, reservation.guests]
      );
      
      if (tablesResult.rows.length === 0) {
        throw new Error('No hay mesas disponibles para confirmar esta reserva. Por favor, intenta modificar los datos de la reserva.');
      }
      
      const selectedTable = tablesResult.rows[0];
      console.log(`✅ [CONFIRM PENDING2] Mesa asignada: ${selectedTable.name}`);
      
      await ctx.db.query(
        `UPDATE reservations SET 
          status = 'confirmed', 
          table_ids = $1, 
          updated_at = NOW() 
         WHERE confirmation_token2 = $2`,
        [JSON.stringify([selectedTable.id]), input.token2]
      );
    } else {
      await ctx.db.query(
        `UPDATE reservations SET status = 'confirmed', updated_at = NOW() WHERE confirmation_token2 = $1`,
        [input.token2]
      );
    }

    console.log('✅ [CONFIRM PENDING2] Reserva confirmada:', reservation.id);

    const notificationPhonesResult = await ctx.db.query(
      'SELECT notification_phones, whatsapp_type FROM restaurants WHERE id = $1',
      [reservation.restaurant_id]
    );
    
    const notificationPhones = notificationPhonesResult.rows[0]?.notification_phones
      ? (Array.isArray(notificationPhonesResult.rows[0].notification_phones) 
          ? notificationPhonesResult.rows[0].notification_phones 
          : JSON.parse(notificationPhonesResult.rows[0].notification_phones))
      : [];

    const whatsappType = notificationPhonesResult.rows[0]?.whatsapp_type || reservation.whatsapp_type || 'free';
    const canSendWhatsApp = reservation.auto_send_whatsapp && (reservation.use_whatsapp_web || whatsappType === 'paid');

    if (canSendWhatsApp) {
      const timeData = typeof reservation.time === 'string' 
        ? JSON.parse(reservation.time) 
        : reservation.time;
      const timeString = `${String(timeData.hour).padStart(2, '0')}:${String(timeData.minute).padStart(2, '0')}`;

      const dateObj = new Date(reservation.date);
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formattedDate = `${dayName}, ${day}/${month}/${year}`;

      const totalGuests = parseInt(reservation.guests);
      const highChairCount = parseInt(reservation.high_chair_count) || 0;
      const clientAdultsCount = totalGuests - highChairCount;
      
      let clientGuestsDetail = `👥 *Comensales:* ${totalGuests} ${totalGuests === 1 ? 'persona' : 'personas'}\n`;
      if (clientAdultsCount > 0 && highChairCount > 0) {
        clientGuestsDetail += `  🧍🏻 ${clientAdultsCount} ${clientAdultsCount === 1 ? 'adulto' : 'adultos'}\n`;
        clientGuestsDetail += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      } else if (highChairCount > 0) {
        clientGuestsDetail += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      }
      if (reservation.needs_stroller) {
        clientGuestsDetail += `  🛒 Con carrito\n`;
      }
      if (reservation.has_pets) {
        clientGuestsDetail += `  🐾 Con mascota\n`;
      }
      
      const locationNameResult = await ctx.db.query(
        'SELECT name FROM table_locations WHERE id = $1',
        [reservation.location_id]
      );
      const locationName = locationNameResult.rows[0]?.name || 'Comedor';
      
      const customMessageResult = await ctx.db.query(
        'SELECT whatsapp_custom_message FROM restaurants WHERE id = $1',
        [reservation.restaurant_id]
      );
      const customMessage = customMessageResult.rows[0]?.whatsapp_custom_message || '';
      
      const reservationNumber = reservation.id.slice(-8);
      const confirmationToken = input.token2;
      
      const confirmationMessage = `✅ RESERVA CONFIRMADA\n\n` +
        `Hola ${reservation.client_name},\n\n` +
        `Nos complace confirmar su reserva en ${reservation.restaurant_name}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📋 DETALLES DE LA RESERVA\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Nº Reserva: ${reservationNumber}\n` +
        `Fecha: ${formattedDate}\n` +
        `🕐 Hora: ${timeString}\n` +
        `📍 Ubicación: ${locationName}\n` +
        clientGuestsDetail +
        (customMessage ? `\n${customMessage}\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔗 GESTIONAR RESERVA\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Puede modificar o cancelar su reserva hasta 2 horas antes.\n\n` +
        `Gestione su reserva aquí: 👇\n` +
        `https://quieromesa.com/client/reservation2/${confirmationToken}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `¡Esperamos verle pronto!\n\n` +
        `Saludos cordiales,\n` +
        `${reservation.restaurant_name}`;

      console.log('📝 [CONFIRM PENDING2] Encolando confirmación para envío por worker...');
      const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
      try {
        await notificationQueue.scheduleNotification({
          restaurantId: reservation.restaurant_id,
          reservationId: reservation.id,
          recipientPhone: reservation.client_phone,
          recipientName: reservation.client_name,
          message: confirmationMessage,
          notificationType: 'reservation_confirmed',
          scheduledFor: new Date(),
        });
        console.log('✅ [CONFIRM PENDING2] Confirmación encolada para envío por worker');
      } catch (queueError) {
        console.error('❌ [CONFIRM PENDING2] Error encolando confirmación:', queueError);
      }

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
            whatsappMessage: confirmationMessage,
            subject: `✅ Reserva Confirmada - ${reservation.restaurant_name}`,
            restaurantName: reservation.restaurant_name,
            clientName: reservation.client_name,
            clientPhone: reservation.client_phone,
          });
          console.log('✅ [CONFIRM PENDING2] Email de confirmación enviado al restaurante');
        }
      } catch (emailError) {
        console.error('❌ [CONFIRM PENDING2] Error enviando email:', emailError);
      }

      const updatedReservation = await ctx.db.query(
        'SELECT table_ids FROM reservations WHERE confirmation_token2 = $1',
        [input.token2]
      );
      const tableIds = updatedReservation.rows[0] ? JSON.parse(updatedReservation.rows[0].table_ids || '[]') : [];
      
      let tableNames = '';
      if (tableIds.length > 0) {
        const tablesResult = await ctx.db.query(
          'SELECT name FROM tables WHERE id = ANY($1::text[])',
          [tableIds]
        );
        tableNames = tablesResult.rows.map((t: any) => t.name).join(', ');
      }
      
      const restaurantAdultsCount = totalGuests - highChairCount;
      let restaurantGuestsDetail = `👥 *Comensales:* ${totalGuests} ${totalGuests === 1 ? 'Persona' : 'Personas'}\n`;
      if (restaurantAdultsCount > 0) {
        restaurantGuestsDetail += `  🧍🏻 ${restaurantAdultsCount} ${restaurantAdultsCount === 1 ? 'adulto' : 'adultos'}\n`;
      }
      if (reservation.needs_high_chair && highChairCount > 0) {
        restaurantGuestsDetail += `  🪑 ${highChairCount} ${highChairCount === 1 ? 'trona' : 'tronas'}\n`;
      }
      if (reservation.needs_stroller) {
        restaurantGuestsDetail += `  🛒 Con carrito\n`;
      }
      if (reservation.has_pets) {
        restaurantGuestsDetail += `  🐾 Con mascota\n`;
      }
      
      const restaurantNotificationMessage = `⚠️ *RESERVA CONFIRMADA*\n\n` +
        `El cliente *${reservation.client_name}* ha confirmado su reserva:\n\n` +
        `📅  *Fecha:* ${formattedDate}\n` +
        `🕐  *Hora:* ${timeString}\n` +
        `📍  *Ubicación:* ${locationName}\n` +
        (tableNames ? `📍  *Mesa asig:* ${tableNames}\n` : '') +
        restaurantGuestsDetail +
        `\n📱 *Teléfono:* ${reservation.client_phone}\n` +
        `🆔 *Nº Reserva:* ${reservationNumber}`;

      for (const phone of notificationPhones) {
        try {
          await notificationQueue.scheduleNotification({
            restaurantId: reservation.restaurant_id,
            reservationId: reservation.id,
            recipientPhone: phone,
            recipientName: reservation.restaurant_name,
            message: restaurantNotificationMessage,
            notificationType: 'restaurant_confirmation',
            scheduledFor: new Date(),
          });
          console.log(`[CONFIRM PENDING2] ✅ Notificación al restaurante encolada: ${phone}`);
        } catch (error) {
          console.error(`[CONFIRM PENDING2] ❌ Error encolando notificación al restaurante ${phone}:`, error);
        }
      }
    }

    return { success: true };
  });
