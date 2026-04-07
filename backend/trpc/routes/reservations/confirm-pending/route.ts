import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import { WhatsAppNotificationQueue } from '../../../../services/whatsapp-notification-queue';
import { sendRestaurantEmailNotification } from '../../../../services/email';

export const confirmPendingReservationProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CONFIRM PENDING] Confirmando reserva pendiente:', input.token);

    const reservationResult = await ctx.db.query(
      `SELECT r.*, rest.name as restaurant_name, rest.use_whatsapp_web, rest.auto_send_whatsapp,
              rest.reminder1_enabled, rest.reminder1_hours, rest.reminder2_enabled, rest.reminder2_minutes,
              rest.whatsapp_type, rest.notification_phones
       FROM reservations r
       JOIN restaurants rest ON r.restaurant_id = rest.id
       WHERE r.confirmation_token = $1 AND r.status = 'pending'`,
      [input.token]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reserva no encontrada o ya confirmada');
    }

    const reservation = reservationResult.rows[0];
    const now = new Date();
    const expiresAt = reservation.pending_expires_at ? new Date(reservation.pending_expires_at) : new Date(0);
    const hasExpired = now > expiresAt;

    console.log('🔍 [CONFIRM PENDING] Estado de expiración:', {
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hasExpired,
    });

    let finalTableIds = typeof reservation.table_ids === 'string' 
      ? JSON.parse(reservation.table_ids) 
      : reservation.table_ids || [];

    if (hasExpired && finalTableIds.length > 0) {
      console.log('⏰ [CONFIRM PENDING] Reserva expirada, verificando disponibilidad de mesas...');
      
      const reservationsOnSameDay = await ctx.db.query(
        `SELECT r.*, COALESCE(t.rotation_time_minutes, 120) as rotation_time_minutes
         FROM reservations r
         LEFT JOIN tables t ON t.id = ANY(string_to_array(trim(both '[]' from r.table_ids::text), ',')::text[])
         WHERE r.restaurant_id = $1 
         AND r.location_id = $2 
         AND r.date::date = $3::date
         AND r.status = 'confirmed'
         AND r.id != $4`,
        [reservation.restaurant_id, reservation.location_id, reservation.date, reservation.id]
      );

      const resTime = typeof reservation.time === 'string' 
        ? JSON.parse(reservation.time) 
        : reservation.time;
      const slotTime = resTime.hour * 60 + resTime.minute;
      const occupiedTableIds = new Set<string>();

      reservationsOnSameDay.rows.forEach((res: any) => {
        const time = typeof res.time === 'string' ? JSON.parse(res.time) : res.time;
        const timeMinutes = time.hour * 60 + time.minute;
        const rotationMinutes = res.rotation_time_minutes || 120;

        if (Math.abs(slotTime - timeMinutes) < rotationMinutes) {
          const tableIds = typeof res.table_ids === 'string' ? JSON.parse(res.table_ids) : res.table_ids;
          if (Array.isArray(tableIds)) {
            tableIds.forEach((tableId: string) => occupiedTableIds.add(tableId));
          }
        }
      });

      const oldTablesStillAvailable = finalTableIds.every((tableId: string) => !occupiedTableIds.has(tableId));

      if (!oldTablesStillAvailable) {
        console.log('⚠️ [CONFIRM PENDING] Mesas originales ya no disponibles, buscando alternativas...');
        
        const tablesResult = await ctx.db.query(
          'SELECT * FROM tables WHERE restaurant_id = $1 AND location_id = $2 ORDER BY priority DESC',
          [reservation.restaurant_id, reservation.location_id]
        );

        const compatibleTables = tablesResult.rows.filter((table: any) => {
          const meetsCapacity = reservation.guests >= table.min_capacity && reservation.guests <= table.max_capacity;
          const meetsHighChair = !reservation.needs_high_chair || table.allows_high_chairs;
          const meetsStroller = !reservation.needs_stroller || table.allows_strollers;
          const meetsPets = !reservation.has_pets || table.allows_pets;
          return meetsCapacity && meetsHighChair && meetsStroller && meetsPets && !occupiedTableIds.has(table.id);
        });

        const tableGroupsResult = await ctx.db.query(
          'SELECT * FROM table_groups WHERE restaurant_id = $1 AND location_id = $2 ORDER BY priority DESC',
          [reservation.restaurant_id, reservation.location_id]
        );
        
        const compatibleGroups = tableGroupsResult.rows.filter((group: any) => {
          const meetsCapacity = reservation.guests >= group.min_capacity && reservation.guests <= group.max_capacity;
          const groupTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
          const allAvailable = groupTableIds.every((tableId: string) => !occupiedTableIds.has(tableId));
          return meetsCapacity && allAvailable && groupTableIds.length > 0;
        });

        finalTableIds = [];
        let assigned = false;

        for (const group of compatibleGroups) {
          finalTableIds = Array.isArray(group.table_ids) ? group.table_ids : [];
          console.log('✅ [CONFIRM PENDING] Grupo alternativo asignado:', group.id);
          assigned = true;
          break;
        }

        if (!assigned && compatibleTables.length > 0) {
          finalTableIds = [compatibleTables[0].id];
          console.log('✅ [CONFIRM PENDING] Mesa alternativa asignada:', compatibleTables[0].id);
          assigned = true;
        }

        if (!assigned) {
          throw new Error('No hay mesas disponibles para confirmar esta reserva. Por favor, modifica las características de tu reserva o selecciona otra fecha/hora.');
        }
      } else {
        console.log('✅ [CONFIRM PENDING] Mesas originales aún disponibles');
      }
    }

    if (reservation.is_new_client) {
      console.log('🔵 [CONFIRM PENDING] Registrando nuevo cliente:', reservation.client_id);
      const now = new Date();
      try {
        await ctx.db.query(
          `INSERT INTO clients (id, name, email, phone, rating, total_ratings, rating_details, 
                no_show_count, is_blocked, terms_accepted_at, whatsapp_notifications_accepted, 
                data_storage_accepted, rating_accepted, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             terms_accepted_at = EXCLUDED.terms_accepted_at,
             whatsapp_notifications_accepted = EXCLUDED.whatsapp_notifications_accepted,
             data_storage_accepted = EXCLUDED.data_storage_accepted,
             rating_accepted = EXCLUDED.rating_accepted`,
          [
            reservation.client_id,
            reservation.client_name,
            '',
            reservation.client_phone,
            4.0,
            0,
            JSON.stringify({ punctuality: 4.0, behavior: 4.0, kindness: 4.0 }),
            0,
            false,
            now,
            true,
            true,
            true,
            now,
          ]
        );
        console.log('✅ [CONFIRM PENDING] Nuevo cliente registrado');
      } catch (error: any) {
        console.error('❌ [CONFIRM PENDING] Error registrando cliente:', error);
      }
    } else {
      await ctx.db.query(
        `UPDATE clients SET 
          terms_accepted_at = NOW(),
          whatsapp_notifications_accepted = true,
          data_storage_accepted = true,
          rating_accepted = true
         WHERE id = $1`,
        [reservation.client_id]
      );
      console.log('✅ [CONFIRM PENDING] Cliente existente actualizado');
    }

    // VALIDACIÓN CRÍTICA: No permitir confirmar sin mesa
    if (finalTableIds.length === 0) {
      console.error('❌ [CONFIRM PENDING] No se puede confirmar sin mesa asignada');
      throw new Error('No hay mesas disponibles para confirmar esta reserva. Por favor, modifica las características de tu reserva o selecciona otra fecha/hora.');
    }

    await ctx.db.query(
      `UPDATE reservations SET status = 'confirmed', table_ids = $1, updated_at = NOW() WHERE confirmation_token = $2`,
      [JSON.stringify(finalTableIds), input.token]
    );

    console.log('✅ [CONFIRM PENDING] Reserva confirmada con mesa:', { reservationId: reservation.id, tables: finalTableIds });

    const reminder1Enabled = reservation.reminder1_enabled || false;
    const reminder1Hours = reservation.reminder1_hours || 24;
    const reminder2Enabled = reservation.reminder2_enabled || false;
    const reminder2Minutes = reservation.reminder2_minutes || 60;

    const useCloudApiConfirm = reservation.whatsapp_type === 'paid';
    const canSendWhatsapp = reservation.use_whatsapp_web || useCloudApiConfirm;

    if ((reminder1Enabled || reminder2Enabled) && canSendWhatsapp && reservation.auto_send_whatsapp) {
      console.log('📅 [CONFIRM PENDING] Programando recordatorios...');
      const notificationQueue = new WhatsAppNotificationQueue(ctx.db);
      const resTime = typeof reservation.time === 'string' ? JSON.parse(reservation.time) : reservation.time;
      const reservationDateTime = new Date(`${reservation.date}T${String(resTime.hour).padStart(2, '0')}:${String(resTime.minute).padStart(2, '0')}:00`);
      const minutesUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);

      const dateObj = new Date(reservation.date);
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formattedDate = `${dayName}, ${day}/${month}/${year}`;
      const timeString = `${String(resTime.hour).padStart(2, '0')}:${String(resTime.minute).padStart(2, '0')}`;

      if (reminder1Enabled && minutesUntilReservation > (reminder1Hours * 60)) {
        const scheduledFor1 = new Date(reservationDateTime.getTime() - reminder1Hours * 60 * 60 * 1000);
        const reminder1Message = `Hola *${reservation.client_name}*, le recordamos que tiene una reserva el *${formattedDate}* a las *${timeString}*, si lo desea puede modificar esta reserva desde el mensaje anterior que ha recibido confirmando la reserva. Quedamos a su disposición para solucionar cualquier duda. Un saludo.\n\n*${reservation.restaurant_name}*`;
        
        await notificationQueue.scheduleNotification({
          restaurantId: reservation.restaurant_id,
          reservationId: reservation.id,
          recipientPhone: reservation.client_phone,
          recipientName: reservation.client_name,
          message: reminder1Message,
          notificationType: `reminder_${reminder1Hours}h`,
          scheduledFor: scheduledFor1,
        });
      }

      if (reminder2Enabled && minutesUntilReservation > reminder2Minutes) {
        const scheduledFor2 = new Date(reservationDateTime.getTime() - reminder2Minutes * 60 * 1000);
        const reminder2Message = `Hola *${reservation.client_name}*, le recordamos que tiene una reserva Hoy a las *${timeString}*, le rogamos puntualidad. Un saludo.\n\n*${reservation.restaurant_name}*`;
        
        await notificationQueue.scheduleNotification({
          restaurantId: reservation.restaurant_id,
          reservationId: reservation.id,
          recipientPhone: reservation.client_phone,
          recipientName: reservation.client_name,
          message: reminder2Message,
          notificationType: `reminder_${reminder2Minutes}m`,
          scheduledFor: scheduledFor2,
        });
      }
    }

    if (canSendWhatsapp && reservation.auto_send_whatsapp) {
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
      const adultsCount = totalGuests - highChairCount;
      
      let guestsDetail = `👥 Comensales: ${totalGuests} ${totalGuests === 1 ? 'persona' : 'personas'}\n`;
      if (adultsCount > 0 && highChairCount > 0) {
        guestsDetail += `\n  🧍🏻 Adultos: ${adultsCount}\n`;
        guestsDetail += `  🪑 Tronas: ${highChairCount}\n`;
      } else if (highChairCount > 0) {
        guestsDetail += `\n  🪑 Tronas: ${highChairCount}\n`;
      }
      if (reservation.needs_stroller) {
        guestsDetail += `  🛒 Con carrito\n`;
      }
      if (reservation.has_pets) {
        guestsDetail += `  🐾 Con mascota\n`;
      }

      const locationNameResult = await ctx.db.query(
        'SELECT name FROM table_locations WHERE id = $1',
        [reservation.location_id]
      );
      const locationName = locationNameResult.rows[0]?.name || 'Comedor';
      
      const customMessageResult = await ctx.db.query(
        'SELECT custom_whatsapp_message FROM restaurants WHERE id = $1',
        [reservation.restaurant_id]
      );
      const customMessage = customMessageResult.rows[0]?.custom_whatsapp_message || '';
      
      const reservationNumber = reservation.id.slice(-8);
      
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
        guestsDetail +
        (customMessage ? `\n${customMessage}\n` : '') +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔗 GESTIONAR RESERVA\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Puede modificar o cancelar su reserva hasta 2 horas antes.\n\n` +
        `Gestione su reserva aquí: 👇\n` +
        `https://quieromesa.com/client/reservation2/${reservation.confirmation_token2}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `¡Esperamos verle pronto!\n\n` +
        `Saludos cordiales,\n` +
        `${reservation.restaurant_name}`;

      console.log('📝 [CONFIRM PENDING] Encolando confirmación para envío por worker...');
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
        console.log('✅ [CONFIRM PENDING] Confirmación encolada para envío por worker');
      } catch (queueError) {
        console.error('❌ [CONFIRM PENDING] Error encolando confirmación:', queueError);
      }

      // Notificar al restaurante que el cliente ha confirmado
      try {
        let notificationPhones: string[] = [];
        try {
          notificationPhones = reservation.notification_phones
            ? (Array.isArray(reservation.notification_phones)
                ? reservation.notification_phones
                : JSON.parse(reservation.notification_phones))
            : [];
        } catch { notificationPhones = []; }

        if (notificationPhones.length > 0) {
          const resTime2 = typeof reservation.time === 'string' ? JSON.parse(reservation.time) : reservation.time;
          const timeString2 = `${String(resTime2.hour).padStart(2, '0')}:${String(resTime2.minute).padStart(2, '0')}`;
          const dateObj2 = new Date(reservation.date);
          const dayName2 = dateObj2.toLocaleDateString('es-ES', { weekday: 'long' });
          const day2 = String(dateObj2.getDate()).padStart(2, '0');
          const month2 = String(dateObj2.getMonth() + 1).padStart(2, '0');
          const year2 = dateObj2.getFullYear();
          const formattedDate2 = `${dayName2}, ${day2}/${month2}/${year2}`;
          const totalGuests2 = parseInt(reservation.guests);
          const highChairCount2 = parseInt(reservation.high_chair_count) || 0;
          const adultsCount2 = totalGuests2 - highChairCount2;
          const reservationIdShort2 = reservation.id.slice(-8).toUpperCase();

          let restaurantNotifMessage = `✅ *RESERVA CONFIRMADA POR EL CLIENTE*\n\n`;
          restaurantNotifMessage += `*${reservation.client_name}* ha confirmado su reserva:\n\n`;
          restaurantNotifMessage += `📅 *Fecha:* ${formattedDate2}\n`;
          restaurantNotifMessage += `🕐 *Hora:* ${timeString2}\n`;
          restaurantNotifMessage += `📍 *Ubicación:* ${reservation.location_name || ''}\n`;
          restaurantNotifMessage += `👥 *Comensales:* ${totalGuests2} ${totalGuests2 === 1 ? 'persona' : 'personas'}\n`;
          if (adultsCount2 > 0 && highChairCount2 > 0) {
            restaurantNotifMessage += `  🧍🏻 ${adultsCount2} adultos\n`;
            restaurantNotifMessage += `  🪑 ${highChairCount2} tronas\n`;
          }
          if (reservation.needs_stroller) restaurantNotifMessage += `  🛒 Con carrito\n`;
          if (reservation.has_pets) restaurantNotifMessage += `  🐾 Con mascota\n`;
          restaurantNotifMessage += `\n📱 *Teléfono:* ${reservation.client_phone}\n`;
          restaurantNotifMessage += `🆔 *Nº Reserva:* ${reservationIdShort2}`;

          for (const phone of notificationPhones) {
            const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            await ctx.db.query(
              `INSERT INTO whatsapp_notifications (
                id, restaurant_id, reservation_id, recipient_phone, recipient_name,
                message, notification_type, scheduled_for, status, attempts, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'pending', 0, NOW())`,
              [
                notifId,
                reservation.restaurant_id,
                reservation.id,
                phone,
                reservation.restaurant_name,
                restaurantNotifMessage,
                'restaurant_confirmation'
              ]
            );
            console.log(`✅ [CONFIRM PENDING] Notificación al restaurante encolada para ${phone}`);
          }
        } else {
          console.log('⚠️ [CONFIRM PENDING] No hay notification_phones configurados para notificar al restaurante');
        }
      } catch (restaurantNotifError) {
        console.error('❌ [CONFIRM PENDING] Error encolando notificación al restaurante:', restaurantNotifError);
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
          console.log('✅ [CONFIRM PENDING] Email de confirmación enviado al restaurante');
        }
      } catch (emailError) {
        console.error('❌ [CONFIRM PENDING] Error enviando email:', emailError);
      }
    }

    // Mark associated waitlist entry as confirmed
    try {
      await ctx.db.query(
        `UPDATE waitlist SET status = 'confirmed', last_notified_at = NOW()
         WHERE restaurant_id = $1 AND client_phone = $2 AND date::text LIKE $3 AND status = 'waiting'`,
        [reservation.restaurant_id, reservation.client_phone, `${reservation.date.toString().split('T')[0]}%`]
      );
      console.log('✅ [CONFIRM PENDING] Entrada de lista de espera marcada como confirmada');
    } catch (wlErr) {
      console.error('⚠️ [CONFIRM PENDING] Error actualizando lista de espera:', wlErr);
    }

    return { success: true };
  });
